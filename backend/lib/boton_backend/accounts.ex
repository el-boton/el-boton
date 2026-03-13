defmodule BotonBackend.Accounts do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Auth.AccessToken
  alias BotonBackend.Accounts.{AuditLog, PhoneOtpChallenge, Profile, RefreshToken, User}
  alias BotonBackend.Repo
  alias BotonBackend.Utils.Geohash
  alias Ecto.Multi

  @otp_request_window_minutes 15
  @otp_request_limit 5
  @otp_ip_request_limit 10

  # E.164: + followed by 1-15 digits
  @e164_regex ~r/^\+[1-9]\d{1,14}$/

  def get_user(user_id), do: Repo.get(User, user_id)

  def get_profile(user_id), do: Repo.get(Profile, user_id)

  def request_otp(phone, context) do
    normalized_phone = normalize_phone(phone)

    with :ok <- validate_e164(normalized_phone) do
      if apple_review_bypass?(normalized_phone) do
        {:ok, %{ok: true}}
      else
        do_request_otp(normalized_phone, context)
      end
    end
  end

  def verify_otp(phone, code, context) do
    normalized_phone = normalize_phone(phone)

    with :ok <- validate_e164(normalized_phone) do
      if apple_review_bypass?(normalized_phone) and code == apple_review_code() do
        verify_apple_review(normalized_phone, context)
      else
        do_verify_otp(normalized_phone, code, context)
      end
    end
  end

  def refresh_session(raw_refresh_token, context) do
    hashed_token = hash_secret(raw_refresh_token)

    refresh_token =
      RefreshToken
      |> where([token], token.token_hash == ^hashed_token)
      |> where([token], is_nil(token.revoked_at))
      |> where([token], token.expires_at > ^DateTime.utc_now())
      |> preload(:user)
      |> Repo.one()

    case refresh_token do
      nil ->
        record_audit("refresh_failed", %{ip_address: context.ip_address, metadata: %{reason: "invalid_refresh_token"}})
        {:error, :invalid_refresh_token, "Invalid refresh token"}

      %RefreshToken{} = token ->
        Repo.transaction(fn ->
          token
          |> Ecto.Changeset.change(revoked_at: DateTime.utc_now(), last_used_at: DateTime.utc_now())
          |> Repo.update!()

          case create_session(token.user, context) do
            {:ok, session} -> session
            {:error, reason} -> Repo.rollback(reason)
          end
        end)
        |> case do
          {:ok, session} ->
            record_audit("refresh_succeeded", %{user_id: token.user_id, ip_address: context.ip_address})
            {:ok, session}

          {:error, _reason} ->
            {:error, :invalid_refresh_token, "Invalid refresh token"}
        end
    end
  end

  def revoke_refresh_token(raw_refresh_token, context) do
    hashed_token = hash_secret(raw_refresh_token)

    RefreshToken
    |> where([token], token.token_hash == ^hashed_token)
    |> Repo.one()
    |> case do
      nil ->
        :ok

      %RefreshToken{} = refresh_token ->
        refresh_token
        |> Ecto.Changeset.change(revoked_at: DateTime.utc_now())
        |> Repo.update()

        record_audit("logout", %{user_id: refresh_token.user_id, ip_address: context.ip_address})
        :ok
    end
  end

  def delete_account(user_id, context) do
    case Repo.get(User, user_id) do
      nil ->
        {:error, :not_found, "User not found"}

      %User{} = user ->
        Repo.transaction(fn ->
          record_audit("account_deleted", %{user_id: user_id, phone: user.phone, ip_address: context.ip_address})
          Repo.delete!(user)
        end)

        :ok
    end
  end

  def update_profile(user_id, attrs) do
    profile = Repo.get!(Profile, user_id)

    profile
    |> Profile.changeset(attrs)
    |> Repo.update()
  end

  def update_location(user_id, latitude, longitude) do
    update_profile(user_id, %{
      location: point(longitude, latitude),
      location_geohash: Geohash.encode(latitude, longitude, 6),
      location_updated_at: DateTime.utc_now()
    })
  end

  def authorized_user_from_token(token) do
    with {:ok, claims} <- AccessToken.verify_token(token),
         %User{} = user <- Repo.get(User, claims["sub"]) do
      {:ok, user}
    else
      _ -> {:error, :unauthorized}
    end
  end

  # -- Apple review bypass (env-gated) --

  defp apple_review_bypass?(phone) do
    case apple_review_phone() do
      nil -> false
      review_phone -> phone == review_phone
    end
  end

  defp apple_review_phone do
    Application.get_env(:boton_backend, BotonBackend.Auth)[:apple_review_phone]
  end

  defp apple_review_code do
    Application.get_env(:boton_backend, BotonBackend.Auth)[:apple_review_code]
  end

  defp verify_apple_review(phone, context) do
    with {:ok, user} <- get_or_create_user(phone),
         {:ok, _profile} <- ensure_profile(user),
         {:ok, session} <- create_session(user, context) do
      record_audit("otp_verified", %{user_id: user.id, phone: phone, ip_address: context.ip_address, metadata: %{apple_review: true}})
      {:ok, session}
    else
      _ -> {:error, :invalid_otp, "Invalid or expired verification code"}
    end
  end

  # -- OTP request/verify implementation --

  defp do_request_otp(phone, context) do
    with :ok <- ensure_otp_rate_limit(phone, context) do
      code = generate_otp_code()
      salt = random_token(16)
      expires_at = DateTime.add(DateTime.utc_now(), auth_config(:otp_ttl_seconds), :second)

      attrs = %{
        phone: phone,
        code_hash: hash_secret("#{salt}:#{phone}:#{code}"),
        code_salt: salt,
        expires_at: expires_at,
        ip_address: context.ip_address,
        user_agent: context.user_agent
      }

      changeset = PhoneOtpChallenge.changeset(%PhoneOtpChallenge{}, attrs)

      case Repo.insert(changeset) do
        {:ok, challenge} ->
          case send_otp(phone, code) do
            :ok ->
              record_audit("otp_requested", %{phone: phone, ip_address: context.ip_address, metadata: %{challenge_id: challenge.id}})
              {:ok, %{ok: true}}

            {:error, _reason} ->
              {:error, :otp_request_failed, "Failed to request verification code"}
          end

        {:error, _changeset} ->
          {:error, :otp_request_failed, "Failed to request verification code"}
      end
    end
  end

  defp do_verify_otp(phone, code, context) do
    case latest_active_challenge(phone) do
      nil ->
        record_audit("otp_verify_failed", %{phone: phone, ip_address: context.ip_address, metadata: %{reason: "missing_challenge"}})
        {:error, :invalid_otp, "Invalid or expired verification code"}

      %PhoneOtpChallenge{} = challenge ->
        verify_challenge(challenge, phone, code, context)
    end
  end

  defp verify_challenge(challenge, phone, code, context) do
    cond do
      DateTime.compare(challenge.expires_at, DateTime.utc_now()) == :lt ->
        record_audit("otp_verify_failed", %{phone: phone, ip_address: context.ip_address, metadata: %{reason: "expired"}})
        {:error, :invalid_otp, "Invalid or expired verification code"}

      challenge.attempt_count >= auth_config(:otp_max_attempts) ->
        record_audit("otp_verify_failed", %{phone: phone, ip_address: context.ip_address, metadata: %{reason: "locked"}})
        {:error, :invalid_otp, "Invalid or expired verification code"}

      challenge.code_hash != hash_secret("#{challenge.code_salt}:#{phone}:#{code}") ->
        challenge
        |> Ecto.Changeset.change(attempt_count: challenge.attempt_count + 1)
        |> Repo.update()

        record_audit("otp_verify_failed", %{phone: phone, ip_address: context.ip_address, metadata: %{reason: "mismatch"}})
        {:error, :invalid_otp, "Invalid or expired verification code"}

      true ->
        Multi.new()
        |> Multi.update(:challenge, Ecto.Changeset.change(challenge, consumed_at: DateTime.utc_now()))
        |> Multi.run(:user, fn _repo, _changes -> get_or_create_user(phone) end)
        |> Multi.run(:profile, fn _repo, %{user: user} -> ensure_profile(user) end)
        |> Multi.run(:session, fn _repo, %{user: user} -> create_session(user, context) end)
        |> Repo.transaction()
        |> case do
          {:ok, %{session: session, user: user}} ->
            record_audit("otp_verified", %{user_id: user.id, phone: phone, ip_address: context.ip_address})
            {:ok, session}

          {:error, _step, _reason, _changes} ->
            {:error, :invalid_otp, "Invalid or expired verification code"}
        end
    end
  end

  defp latest_active_challenge(phone) do
    PhoneOtpChallenge
    |> where([challenge], challenge.phone == ^phone)
    |> where([challenge], is_nil(challenge.consumed_at))
    |> order_by([challenge], desc: challenge.inserted_at)
    |> limit(1)
    |> Repo.one()
  end

  defp get_or_create_user(phone) do
    case Repo.get_by(User, phone: phone) do
      %User{} = user ->
        {:ok, user}

      nil ->
        %User{}
        |> User.changeset(%{phone: phone})
        |> Repo.insert()
    end
  end

  defp ensure_profile(%User{} = user) do
    case Repo.get(Profile, user.id) do
      %Profile{} = profile ->
        {:ok, profile}

      nil ->
        %Profile{id: user.id}
        |> Profile.changeset(%{phone: user.phone})
        |> Repo.insert()
    end
  end

  defp create_session(%User{} = user, context) do
    with {:ok, %{token: access_token, expires_in: expires_in}} <- AccessToken.generate(user),
         {:ok, refresh_token} <- create_refresh_token(user, context) do
      {:ok,
       %{
         access_token: access_token,
         refresh_token: refresh_token.raw_token,
         expires_in: expires_in,
         user: %{id: user.id, phone: user.phone}
       }}
    end
  end

  defp create_refresh_token(%User{} = user, context) do
    raw_token = random_token(32)
    expires_at = DateTime.add(DateTime.utc_now(), auth_config(:refresh_token_ttl_seconds), :second)

    %RefreshToken{}
    |> RefreshToken.changeset(%{
      user_id: user.id,
      token_hash: hash_secret(raw_token),
      token_prefix: String.slice(raw_token, 0, 8),
      expires_at: expires_at,
      ip_address: context.ip_address,
      user_agent: context.user_agent
    })
    |> Repo.insert()
    |> case do
      {:ok, token} -> {:ok, %{record: token, raw_token: raw_token}}
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp ensure_otp_rate_limit(phone, context) do
    recent_since = DateTime.add(DateTime.utc_now(), -@otp_request_window_minutes * 60, :second)

    phone_count =
      AuditLog
      |> where([audit], audit.action == "otp_requested" and audit.phone == ^phone and audit.recorded_at >= ^recent_since)
      |> Repo.aggregate(:count, :id)

    ip_count =
      if is_binary(context.ip_address) do
        AuditLog
        |> where([audit], audit.action == "otp_requested" and audit.ip_address == ^context.ip_address and audit.recorded_at >= ^recent_since)
        |> Repo.aggregate(:count, :id)
      else
        0
      end

    latest_request =
      PhoneOtpChallenge
      |> where([challenge], challenge.phone == ^phone)
      |> order_by([challenge], desc: challenge.inserted_at)
      |> limit(1)
      |> Repo.one()

    cooldown_seconds = auth_config(:otp_resend_cooldown_seconds)

    cond do
      phone_count >= @otp_request_limit ->
        {:error, :otp_rate_limited, "Too many verification code requests"}

      ip_count >= @otp_ip_request_limit ->
        {:error, :otp_rate_limited, "Too many verification code requests"}

      latest_request &&
          DateTime.diff(DateTime.utc_now(), latest_request.inserted_at, :second) < cooldown_seconds ->
        {:error, :otp_rate_limited, "Please wait before requesting another code"}

      true ->
        :ok
    end
  end

  def record_audit(action, attrs) do
    %AuditLog{}
    |> AuditLog.changeset(
      Map.merge(
        %{
          action: action,
          recorded_at: DateTime.utc_now(),
          metadata: %{}
        },
        attrs
      )
    )
    |> Repo.insert(on_conflict: :nothing)

    :ok
  end

  defp send_otp(phone, code) do
    provider =
      Application.fetch_env!(:boton_backend, BotonBackend.Notifications.SMS)
      |> Keyword.fetch!(:provider)

    provider.deliver_otp(phone, code)
  end

  defp validate_e164(phone) do
    if Regex.match?(@e164_regex, phone) do
      :ok
    else
      {:error, :invalid_phone, "Phone number must be in E.164 format (e.g. +1234567890)"}
    end
  end

  defp normalize_phone(phone) do
    phone
    |> to_string()
    |> String.trim()
    |> String.replace(~r/[\s\-\(\)]/, "")
    |> maybe_prepend_plus()
  end

  defp maybe_prepend_plus("+" <> _ = phone), do: phone
  defp maybe_prepend_plus(phone), do: "+" <> phone

  defp random_token(bytes) do
    bytes
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end

  defp generate_otp_code do
    # Use CSPRNG instead of :rand.uniform
    bytes = :crypto.strong_rand_bytes(4)
    <<n::unsigned-32>> = bytes
    code = rem(n, 1_000_000)

    code
    |> Integer.to_string()
    |> String.pad_leading(6, "0")
  end

  defp hash_secret(value) do
    secret = auth_config(:token_hash_secret)

    :crypto.mac(:hmac, :sha256, secret, value)
    |> Base.encode16(case: :lower)
  end

  defp auth_config(key) do
    Application.fetch_env!(:boton_backend, BotonBackend.Auth)
    |> Keyword.fetch!(key)
  end

  defp point(longitude, latitude) do
    %Geo.Point{coordinates: {longitude, latitude}, srid: 4326}
  end
end
