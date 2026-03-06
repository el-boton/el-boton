defmodule BotonBackendWeb.UserSocket do
  use Phoenix.Socket

  channel "alert:*", BotonBackendWeb.AlertChannel
  channel "user:*", BotonBackendWeb.UserAlertsChannel

  alias BotonBackend.Accounts

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    with {:ok, user} <- Accounts.authorized_user_from_token(token) do
      {:ok, assign(socket, :current_user, user)}
    else
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.current_user.id}"
end
