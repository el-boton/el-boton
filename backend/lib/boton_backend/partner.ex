defmodule BotonBackend.Partner do
  @moduledoc """
  Server-to-server provisioning for trusted partner integrations (the villa-tablet
  emergency-button integration). Creates a synthetic "premises" user + a responder
  circle for a partner's villa, without the phone-OTP flow, and hands back a refresh
  token the partner replays to mint access JWTs.

  Authenticated by a static shared secret (see Plugs.RequirePartnerSecret). The
  secret is optional at boot: when unset the endpoint is simply disabled (503), so
  deploying this code can never crash a running node.
  """

  alias BotonBackend.{Accounts, Circles, Repo}
  alias BotonBackend.Partner.Premise
  alias BotonBackendWeb.Endpoint

  @doc "The configured provisioning secret, or nil when the feature is disabled."
  def provision_secret do
    Application.get_env(:boton_backend, __MODULE__, [])[:provision_secret]
  end

  @doc """
  Idempotent on `villa_ref`. Creates (or reuses) the premises user + circle and
  returns `%{user_id, circle_id, refresh_token, invite_link}`. Re-provisioning the
  same `villa_ref` returns the existing user/circle with a freshly minted refresh
  token (so the partner can recover a lost token).
  """
  def provision(villa_ref, villa_name, context) do
    villa_ref = String.trim(to_string(villa_ref))
    villa_name = String.trim(to_string(villa_name))

    cond do
      villa_ref == "" -> {:error, :invalid_villa_ref, "villa_ref is required"}
      villa_name == "" -> {:error, :invalid_villa_name, "villa_name is required"}
      true -> do_provision(villa_ref, villa_name, context)
    end
  end

  defp do_provision(villa_ref, villa_name, context) do
    # Serialize concurrent provisions for the SAME villa_ref under a transaction-
    # scoped advisory lock, so two first-time calls can't both create the synthetic
    # user (losing the unique-phone race → spurious 422) or strand a duplicate
    # circle. Everything inside commits or rolls back atomically — no orphans.
    txn =
      Repo.transaction(fn ->
        Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", ["partner_provision:" <> villa_ref])

        outcome =
          case Repo.get_by(Premise, villa_ref: villa_ref) do
            %Premise{} = premise -> reprovision(premise, villa_name, context)
            nil -> provision_new(villa_ref, villa_name, context)
          end

        case outcome do
          {:ok, payload} -> payload
          {:error, code, message} -> Repo.rollback({code, message})
          other -> Repo.rollback({:provision_failed, "unexpected: #{inspect(other)}"})
        end
      end)

    case txn do
      {:ok, payload} -> {:ok, payload}
      {:error, {code, message}} when is_atom(code) -> {:error, code, message}
      {:error, _other} -> {:error, :provision_failed, "Could not provision the premises"}
    end
  end

  defp reprovision(%Premise{} = premise, villa_name, context) do
    with {:ok, %{refresh_token: refresh_token}} <-
           Accounts.provision_partner_user(synthetic_phone(premise.villa_ref), villa_name, context) do
      {:ok, result(premise.user_id, premise.circle_id, premise.invite_code, refresh_token)}
    else
      _ -> {:error, :provision_failed, "Could not refresh the premises token"}
    end
  end

  # Runs inside do_provision's advisory-locked transaction, so it's the sole
  # provisioner for this villa_ref — no insert_premise race to handle, and any
  # failure rolls the whole unit back (no orphan user/circle/token/mapping).
  defp provision_new(villa_ref, villa_name, context) do
    with {:ok, %{user: user, refresh_token: refresh_token}} <-
           Accounts.provision_partner_user(synthetic_phone(villa_ref), villa_name, context),
         {:ok, circle} <- Circles.create_circle(user.id, villa_name),
         {:ok, _premise} <- insert_premise(villa_ref, user.id, circle.id, circle.invite_code) do
      {:ok, result(user.id, circle.id, circle.invite_code, refresh_token)}
    else
      {:error, code, message} when is_atom(code) -> {:error, code, message}
      _ -> {:error, :provision_failed, "Could not provision the premises"}
    end
  end

  defp insert_premise(villa_ref, user_id, circle_id, invite_code) do
    %Premise{}
    |> Premise.changeset(%{
      villa_ref: villa_ref,
      user_id: user_id,
      circle_id: circle_id,
      invite_code: invite_code
    })
    |> Repo.insert()
  end

  # Non-E.164 sentinel: never collides with a real phone and is rejected by the
  # OTP path's E.164 check, so these accounts can only ever be partner-provisioned.
  defp synthetic_phone(villa_ref), do: "partner:" <> villa_ref

  defp result(user_id, circle_id, invite_code, refresh_token) do
    %{
      user_id: user_id,
      circle_id: circle_id,
      refresh_token: refresh_token,
      invite_link: Endpoint.url() <> "/join/" <> invite_code
    }
  end
end
