defmodule BotonBackendWeb.Router do
  use BotonBackendWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug BotonBackendWeb.Plugs.RateLimit, limit: 60, period_ms: 60_000, key_prefix: "api"
  end

  pipeline :auth_api do
    plug :accepts, ["json"]

    plug BotonBackendWeb.Plugs.RateLimit,
      limit: 10,
      period_ms: 60_000,
      key_prefix: "auth",
      global_limit: 10
  end

  pipeline :authenticated_api do
    plug :accepts, ["json"]
    plug BotonBackendWeb.Plugs.RateLimit, limit: 120, period_ms: 60_000, key_prefix: "authed"
    plug BotonBackendWeb.Plugs.RequireAuthenticatedUser
  end

  scope "/", BotonBackendWeb do
    get "/join/:code", InviteController, :show
  end

  scope "/", BotonBackendWeb do
    pipe_through :auth_api

    post "/auth/otp/request", AuthController, :request
    post "/auth/otp/verify", AuthController, :verify
    post "/auth/refresh", AuthController, :refresh
    post "/auth/logout", AuthController, :logout
  end

  scope "/", BotonBackendWeb do
    pipe_through :authenticated_api

    get "/me/profile", MeController, :show
    patch "/me/profile", MeController, :update
    put "/me/location", MeController, :update_location
    delete "/me", MeController, :delete

    get "/circles", CircleController, :index
    post "/circles", CircleController, :create
    post "/circles/join", CircleController, :join
    get "/circles/:id/members", CircleController, :members
    post "/circles/:id/test_alert", CircleController, :test_alert
    delete "/circles/:id/members/me", CircleController, :leave
    delete "/circles/:id/members/:user_id", CircleController, :remove_member
    delete "/circles/:id", CircleController, :delete

    get "/alerts/history", AlertController, :history
    post "/alerts", AlertController, :create
    get "/alerts/:id", AlertController, :show
    post "/alerts/:id/cancel", AlertController, :cancel
    post "/alerts/:id/resolve", AlertController, :resolve
    post "/alerts/:id/expand", AlertController, :expand
    get "/alerts/:id/responses", AlertController, :responses
    put "/alerts/:id/response", AlertController, :respond
    get "/alerts/:id/messages", AlertController, :messages
    post "/alerts/:id/messages", AlertController, :create_message
  end
end
