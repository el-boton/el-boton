defmodule BotonBackendWeb.UserSocket do
  use Phoenix.Socket

  channel "alert:*", BotonBackendWeb.AlertChannel
  channel "user:*", BotonBackendWeb.UserAlertsChannel

  alias BotonBackend.Accounts

  @max_connections_per_user 3

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    with {:ok, user} <- Accounts.authorized_user_from_token(token),
         :ok <- register_or_reject(user.id) do
      {:ok, assign(socket, :current_user, user)}
    else
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.current_user.id}"

  defp register_or_reject(user_id) do
    key = "user:#{user_id}"
    {:ok, _} = Registry.register(BotonBackend.SocketRegistry, key, nil)

    case Registry.lookup(BotonBackend.SocketRegistry, key) do
      entries when length(entries) > @max_connections_per_user ->
        Registry.unregister(BotonBackend.SocketRegistry, key)
        :error

      _ ->
        :ok
    end
  end
end
