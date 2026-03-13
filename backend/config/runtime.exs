import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/boton_backend start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :boton_backend, BotonBackendWeb.Endpoint, server: true
end

optional_env = fn name ->
  case System.get_env(name) do
    nil -> nil
    "" -> nil
    value -> value
  end
end

config :boton_backend, BotonBackendWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

if config_env() != :test do
  expo_access_token = optional_env.("EXPO_ACCESS_TOKEN")

  config :boton_backend, BotonBackend.Repo,
    url:
      System.get_env("DATABASE_URL") ||
        "ecto://postgres:postgres@localhost/boton_backend_dev",
    pool_size: String.to_integer(System.get_env("POOL_SIZE", "10")),
    types: BotonBackend.PostgresTypes

  apple_review_config =
    case {optional_env.("APPLE_REVIEW_PHONE"), optional_env.("APPLE_REVIEW_CODE")} do
      {phone, code} when is_binary(phone) and is_binary(code) ->
        [apple_review_phone: phone, apple_review_code: code]

      _ ->
        []
    end

  config :boton_backend,
         BotonBackend.Auth,
         [
           {:jwt_secret,
            System.get_env("JWT_SIGNING_SECRET") ||
              raise("environment variable JWT_SIGNING_SECRET is missing")},
           {:token_hash_secret,
            System.get_env("TOKEN_HASH_SECRET") ||
              raise("environment variable TOKEN_HASH_SECRET is missing")}
         ] ++ apple_review_config

  config :boton_backend, BotonBackend.Notifications.ExpoClient, access_token: expo_access_token

  config :boton_backend, BotonBackendWeb.Endpoint,
    secret_key_base:
      System.get_env("SECRET_KEY_BASE") ||
        "dev-secret-key-base-change-me-dev-secret-key-base-change-me"
end

case System.get_env("SMS_PROVIDER") do
  "twilio" ->
    config :boton_backend, BotonBackend.Notifications.SMS,
      provider: BotonBackend.Notifications.TwilioSMSProvider,
      account_sid: optional_env.("TWILIO_ACCOUNT_SID"),
      auth_token: optional_env.("TWILIO_AUTH_TOKEN"),
      messaging_service_sid: optional_env.("TWILIO_MESSAGING_SERVICE_SID"),
      whatsapp_content_sid: optional_env.("TWILIO_WHATSAPP_CONTENT_SID")

  _ ->
    :ok
end

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  default_queue_concurrency =
    String.to_integer(System.get_env("OBAN_DEFAULT_CONCURRENCY") || "10")

  push_queue_concurrency = String.to_integer(System.get_env("OBAN_PUSH_CONCURRENCY") || "6")

  config :boton_backend, BotonBackend.Repo,
    ssl: System.get_env("DATABASE_SSL") == "true",
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    types: BotonBackend.PostgresTypes,
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = optional_env.("PHX_HOST") || "example.com"

  config :boton_backend, :dns_cluster_query, optional_env.("DNS_CLUSTER_QUERY")

  config :boton_backend, Oban,
    repo: BotonBackend.Repo,
    queues: [default: default_queue_concurrency, push: push_queue_concurrency],
    plugins: [{Oban.Plugins.Pruner, max_age: 86_400}]

  config :boton_backend, BotonBackendWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :boton_backend, BotonBackendWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :boton_backend, BotonBackendWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
