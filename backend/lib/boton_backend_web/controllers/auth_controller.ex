defmodule BotonBackendWeb.AuthController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Accounts
  alias BotonBackendWeb.ControllerHelpers
  alias BotonBackendWeb.Serializers

  def request(conn, %{"phone" => phone} = params) do
    channel = Map.get(params, "channel", "sms")

    case Accounts.request_otp(phone, ControllerHelpers.request_context(conn), channel) do
      {:ok, result} -> json(conn, result)
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def verify(conn, %{"phone" => phone, "code" => code}) do
    case Accounts.verify_otp(phone, code, ControllerHelpers.request_context(conn)) do
      {:ok, session} -> json(conn, Serializers.session(session))
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def refresh(conn, %{"refresh_token" => refresh_token}) do
    case Accounts.refresh_session(refresh_token, ControllerHelpers.request_context(conn)) do
      {:ok, session} -> json(conn, Serializers.session(session))
      {:error, code, message} -> ControllerHelpers.error(conn, :unauthorized, code, message)
    end
  end

  def logout(conn, %{"refresh_token" => refresh_token}) do
    :ok = Accounts.revoke_refresh_token(refresh_token, ControllerHelpers.request_context(conn))
    send_resp(conn, :no_content, "")
  end

  def logout(conn, _params) do
    send_resp(conn, :no_content, "")
  end
end
