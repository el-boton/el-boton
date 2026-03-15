defmodule BotonBackendWeb.AlertController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Alerts
  alias BotonBackendWeb.ControllerHelpers
  alias BotonBackendWeb.Serializers

  def history(conn, _params) do
    user = conn.assigns.current_user
    json(conn, Alerts.history_for_user(user.id))
  end

  def create(conn, %{"latitude" => latitude, "longitude" => longitude}) do
    user = conn.assigns.current_user

    case Alerts.create_alert(
           user.id,
           latitude,
           longitude,
           ControllerHelpers.request_context(conn)
         ) do
      {:ok, alert} ->
        json(conn, alert)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def show(conn, %{"id" => alert_id}) do
    user = conn.assigns.current_user

    case Alerts.get_alert(user.id, alert_id) do
      {:ok, alert} -> json(conn, Serializers.alert(alert))
      {:error, code, message} -> ControllerHelpers.error(conn, :not_found, code, message)
    end
  end

  def cancel(conn, %{"id" => alert_id}) do
    update_status(conn, alert_id, &Alerts.cancel_alert/2)
  end

  def resolve(conn, %{"id" => alert_id}) do
    update_status(conn, alert_id, &Alerts.resolve_alert/2)
  end

  def expand(conn, %{"id" => alert_id}) do
    user = conn.assigns.current_user

    case Alerts.expand_alert(user.id, alert_id) do
      {:ok, alert} ->
        json(conn, alert)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def responses(conn, %{"id" => alert_id}) do
    user = conn.assigns.current_user

    case Alerts.list_responses(user.id, alert_id) do
      {:ok, responses} -> json(conn, responses)
      {:error, code, message} -> ControllerHelpers.error(conn, :not_found, code, message)
    end
  end

  def respond(conn, %{"id" => alert_id, "status" => status}) do
    user = conn.assigns.current_user

    case Alerts.respond_to_alert(user.id, alert_id, status) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def messages(conn, %{"id" => alert_id}) do
    user = conn.assigns.current_user

    case Alerts.list_messages(user.id, alert_id) do
      {:ok, messages} -> json(conn, messages)
      {:error, code, message} -> ControllerHelpers.error(conn, :not_found, code, message)
    end
  end

  def create_message(conn, %{"id" => alert_id, "message" => message}) do
    user = conn.assigns.current_user

    case Alerts.create_message(user.id, alert_id, message) do
      {:ok, created_message} ->
        json(conn, created_message)

      {:error, :message_rate_limited, message} ->
        ControllerHelpers.error(conn, :too_many_requests, :message_rate_limited, message)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  defp update_status(conn, alert_id, fun) do
    user = conn.assigns.current_user

    case fun.(user.id, alert_id) do
      {:ok, alert} ->
        json(conn, alert)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end
end
