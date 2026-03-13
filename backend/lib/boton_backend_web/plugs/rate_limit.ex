defmodule BotonBackendWeb.Plugs.RateLimit do
  @moduledoc false

  import Plug.Conn

  def init(opts) do
    %{
      limit: Keyword.fetch!(opts, :limit),
      period_ms: Keyword.fetch!(opts, :period_ms),
      key_prefix: Keyword.get(opts, :key_prefix, "api"),
      global_limit: Keyword.get(opts, :global_limit, nil)
    }
  end

  def call(conn, %{limit: limit, period_ms: period_ms, key_prefix: prefix, global_limit: global_limit}) do
    with :ok <- check_global(prefix, period_ms, global_limit),
         :ok <- check_per_ip(prefix, period_ms, limit, client_ip(conn)) do
      conn
    else
      :denied -> rate_limited(conn)
    end
  end

  defp check_global(_prefix, _period_ms, nil), do: :ok

  defp check_global(prefix, period_ms, global_limit) do
    case Hammer.check_rate("#{prefix}:global", period_ms, global_limit) do
      {:allow, _count} -> :ok
      {:deny, _limit} -> :denied
    end
  end

  defp check_per_ip(prefix, period_ms, limit, ip) do
    case Hammer.check_rate("#{prefix}:#{ip}", period_ms, limit) do
      {:allow, _count} -> :ok
      {:deny, _limit} -> :denied
    end
  end

  defp rate_limited(conn) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(429, Jason.encode!(%{error: "rate_limited", message: "Too many requests"}))
    |> halt()
  end

  defp client_ip(conn) do
    # Cloudflare Tunnel sets CF-Connecting-IP to the real client IP.
    # Fall back to X-Forwarded-For, then conn.remote_ip.
    case get_req_header(conn, "cf-connecting-ip") do
      [ip | _] ->
        ip

      [] ->
        case get_req_header(conn, "x-forwarded-for") do
          [forwarded | _] -> forwarded |> String.split(",") |> List.first() |> String.trim()
          [] -> conn.remote_ip |> :inet.ntoa() |> to_string()
        end
    end
  end
end
