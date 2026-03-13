defmodule BotonBackendWeb.Plugs.RateLimit do
  @moduledoc false

  import Plug.Conn

  def init(opts) do
    %{
      limit: Keyword.fetch!(opts, :limit),
      period_ms: Keyword.fetch!(opts, :period_ms),
      key_prefix: Keyword.get(opts, :key_prefix, "api")
    }
  end

  def call(conn, %{limit: limit, period_ms: period_ms, key_prefix: prefix}) do
    ip = client_ip(conn)
    key = "#{prefix}:#{ip}"

    case Hammer.check_rate(key, period_ms, limit) do
      {:allow, _count} ->
        conn

      {:deny, _limit} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(429, Jason.encode!(%{error: "rate_limited", message: "Too many requests"}))
        |> halt()
    end
  end

  defp client_ip(conn) do
    # Cloudflare Tunnel sets CF-Connecting-IP to the real client IP.
    # Fall back to X-Forwarded-For, then conn.remote_ip.
    case get_req_header(conn, "cf-connecting-ip") do
      [ip | _] -> ip
      [] ->
        case get_req_header(conn, "x-forwarded-for") do
          [forwarded | _] -> forwarded |> String.split(",") |> List.first() |> String.trim()
          [] -> conn.remote_ip |> :inet.ntoa() |> to_string()
        end
    end
  end
end
