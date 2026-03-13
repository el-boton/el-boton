defmodule BotonBackend.Fixtures do
  @moduledoc false

  import ExUnit.CaptureLog
  import Plug.Conn

  alias BotonBackend.Accounts
  alias BotonBackend.Circles

  def request_context(overrides \\ %{}) do
    Map.merge(
      %{
        ip_address: "127.0.0.1",
        user_agent: "boton-test-suite"
      },
      overrides
    )
  end

  def unique_phone do
    suffix =
      System.unique_integer([:positive])
      |> Integer.to_string()
      |> String.pad_leading(10, "0")
      |> String.slice(-10, 10)

    "+1#{suffix}"
  end

  def user_fixture(attrs \\ %{}) do
    phone = Map.get(attrs, :phone, unique_phone())

    code = request_otp_code(phone)
    {:ok, session} = Accounts.verify_otp(phone, code, request_context())

    maybe_update_profile(session.user.id, attrs)

    %{
      session: session,
      user: Accounts.get_user(session.user.id),
      profile: Accounts.get_profile(session.user.id)
    }
  end

  def auth_conn(conn, %{access_token: access_token}) do
    put_req_header(conn, "authorization", "Bearer #{access_token}")
  end

  def circle_fixture(owner, attrs \\ %{}) do
    name = Map.get(attrs, :name, "Family")
    {:ok, circle} = Circles.create_circle(owner.user.id, name)
    circle
  end

  def request_otp_code(phone, context \\ request_context()) do
    {request_result, log} =
      with_log(fn ->
        Accounts.request_otp(phone, context)
      end)

    case request_result do
      {:ok, %{ok: true}} -> extract_otp_code!(log, phone)
      {:error, code, message} -> raise "OTP request failed: #{code} #{message}"
    end
  end

  defp maybe_update_profile(user_id, attrs) do
    profile_attrs =
      attrs
      |> Map.take([:display_name, :push_token])

    if profile_attrs != %{} do
      {:ok, _profile} = Accounts.update_profile(user_id, profile_attrs)
    end

    case {Map.get(attrs, :latitude), Map.get(attrs, :longitude)} do
      {latitude, longitude} when is_number(latitude) and is_number(longitude) ->
        {:ok, _profile} = Accounts.update_location(user_id, latitude, longitude)

      _ ->
        :ok
    end
  end

  def extract_otp_code!(log, phone) do
    regex = ~r/DEV OTP for #{Regex.escape(phone)} via \w+: (?<code>\d{6})/

    case Regex.named_captures(regex, log) do
      %{"code" => code} -> code
      _ -> raise "Could not find OTP code for #{phone} in captured log"
    end
  end
end
