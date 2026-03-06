defmodule BotonBackendWeb.ChannelCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      use BotonBackendWeb, :verified_routes
      alias BotonBackend.Repo

      import Phoenix.ChannelTest
      import BotonBackendWeb.ChannelCase
      import BotonBackend.Fixtures

      @endpoint BotonBackendWeb.Endpoint
    end
  end

  setup tags do
    BotonBackend.DataCase.setup_sandbox(tags)
    :ok
  end
end
