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
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
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
end
