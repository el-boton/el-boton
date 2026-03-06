defmodule BotonBackendWeb.ControllerHelpers do
  @moduledoc false

  import Phoenix.Controller, only: [json: 2]
  import Plug.Conn, only: [put_status: 2]

  def error(conn, status, code, message, details \\ nil) do
    body = %{
      error: %{
        code: to_string(code),
        message: message,
        details: details
      }
    }

    conn
    |> put_status(status)
    |> json(body)
  end

  def request_context(conn) do
    %{
      ip_address: conn.remote_ip |> Tuple.to_list() |> Enum.join("."),
      user_agent: List.first(Plug.Conn.get_req_header(conn, "user-agent"))
    }
  end
end
