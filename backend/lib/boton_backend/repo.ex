defmodule BotonBackend.Repo do
  use Ecto.Repo,
    otp_app: :boton_backend,
    adapter: Ecto.Adapters.Postgres
end
