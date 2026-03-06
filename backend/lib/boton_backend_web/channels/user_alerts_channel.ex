defmodule BotonBackendWeb.UserAlertsChannel do
  use Phoenix.Channel

  @impl true
  def join("user:" <> topic, _payload, socket) do
    case String.split(topic, ":alerts") do
      [user_id, ""] ->
        if socket.assigns.current_user.id == user_id do
          {:ok, socket}
        else
          {:error, %{reason: "unauthorized"}}
        end

      _ ->
        {:error, %{reason: "invalid_topic"}}
    end
  end
end
