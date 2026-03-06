FROM elixir:1.17

RUN mix local.hex --force && mix local.rebar --force

WORKDIR /app

COPY mix.exs mix.lock ./
COPY config config

RUN mix deps.get

COPY . .

CMD ["mix", "phx.server"]
