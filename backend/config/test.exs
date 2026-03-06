import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :boton_backend, BotonBackend.Repo,
  username: "postgres",
  password: "postgres",
  hostname: System.get_env("DATABASE_HOST", "localhost"),
  database:
    System.get_env("DATABASE_NAME") ||
      "boton_backend_test#{System.get_env("MIX_TEST_PARTITION")}",
  types: BotonBackend.PostgresTypes,
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :boton_backend, BotonBackendWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "07MV/QSdiAlQr2SlIpv8Yjef1U7F4tEOtq85DszsQr5RZ4m68IgRuCPYRsiuPzQw",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true

config :boton_backend, Oban,
  testing: :inline,
  repo: BotonBackend.Repo,
  queues: false,
  plugins: false

config :boton_backend, BotonBackend.Auth,
  access_token_ttl_seconds: 3600,
  refresh_token_ttl_seconds: 2_592_000,
  otp_ttl_seconds: 300,
  otp_resend_cooldown_seconds: 30,
  otp_max_attempts: 5,
  nearby_radius_meters: 50_000,
  jwt_secret: "test-jwt-signing-secret",
  token_hash_secret: "test-token-hash-secret"

config :boton_backend, BotonBackend.Notifications.ExpoClient,
  enabled: false
