defmodule BotonBackendWeb.Plugs.RequirePartnerSecret do
  @moduledoc """
  Gate for the server-to-server partner endpoints. Constant-time compares the
  `x-partner-secret` header against the configured secret. When no secret is
  configured the endpoint is disabled (503) rather than open — and the node still
  boots, so shipping this plug can never take a running server down.
  """
  import Plug.Conn

  alias BotonBackend.Partner
  alias BotonBackendWeb.ControllerHelpers

  def init(opts), do: opts

  def call(conn, _opts) do
    configured = Partner.provision_secret()
    provided = conn |> get_req_header("x-partner-secret") |> List.first()

    cond do
      is_nil(configured) or configured == "" ->
        conn
        |> ControllerHelpers.error(:service_unavailable, :not_configured, "Partner provisioning is not enabled")
        |> halt()

      is_binary(provided) and Plug.Crypto.secure_compare(provided, configured) ->
        conn

      true ->
        conn
        |> ControllerHelpers.error(:unauthorized, :unauthorized, "Unauthorized")
        |> halt()
    end
  end
end
