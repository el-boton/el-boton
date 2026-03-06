defmodule BotonBackendWeb.AlertChannel do
  use Phoenix.Channel

  alias BotonBackend.Alerts

  @impl true
  def join("alert:" <> alert_id, _payload, socket) do
    if Alerts.authorized_for_alert?(socket.assigns.current_user.id, alert_id) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end
end
