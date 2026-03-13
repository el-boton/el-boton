# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :boton_backend,
  ecto_repos: [BotonBackend.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

config :boton_backend, BotonBackend.Auth,
  access_token_ttl_seconds: 3600,
  refresh_token_ttl_seconds: 31_536_000,
  otp_ttl_seconds: 300,
  otp_resend_cooldown_seconds: 30,
  otp_max_attempts: 5,
  nearby_radius_meters: 50_000

config :boton_backend, BotonBackend.Notifications.SMS,
  provider: BotonBackend.Notifications.ConsoleSMSProvider

config :boton_backend, BotonBackend.Notifications.ExpoClient,
  enabled: true,
  endpoint: "https://exp.host/--/api/v2/push/send"

# Configure the endpoint
config :boton_backend, BotonBackendWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: BotonBackendWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: BotonBackend.PubSub,
  live_view: [signing_salt: "5Gv2ZSqK"],
  secret_key_base: "change-me-in-runtime"

config :boton_backend, Oban,
  repo: BotonBackend.Repo,
  queues: [default: 10, push: 10],
  plugins: [
    {Oban.Plugins.Pruner, max_age: 86_400}
  ]

config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 300_000, cleanup_interval_ms: 600_000]}

config :cors_plug,
  origin: ["https://elbotonapp.com", "https://www.elbotonapp.com"],
  headers: ["authorization", "content-type", "accept"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
