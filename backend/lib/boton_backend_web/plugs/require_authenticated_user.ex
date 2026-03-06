defmodule BotonBackendWeb.Plugs.RequireAuthenticatedUser do
  @moduledoc false

  import Plug.Conn

  alias BotonBackend.Accounts
  alias BotonBackendWeb.ControllerHelpers

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, user} <- Accounts.authorized_user_from_token(token) do
      assign(conn, :current_user, user)
    else
      _ ->
        conn
        |> ControllerHelpers.error(:unauthorized, :unauthorized, "Unauthorized")
        |> halt()
    end
  end
end
