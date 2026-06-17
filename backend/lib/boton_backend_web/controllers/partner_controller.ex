defmodule BotonBackendWeb.PartnerController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Partner
  alias BotonBackendWeb.ControllerHelpers

  def provision(conn, %{"villa_ref" => villa_ref, "villa_name" => villa_name}) do
    case Partner.provision(villa_ref, villa_name, ControllerHelpers.request_context(conn)) do
      {:ok, result} ->
        json(conn, result)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def provision(conn, _params) do
    ControllerHelpers.error(conn, :bad_request, :invalid_params, "villa_ref and villa_name are required")
  end
end
