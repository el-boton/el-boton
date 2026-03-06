defmodule BotonBackend.Auth.AccessToken do
  @moduledoc false

  use Joken.Config

  alias BotonBackend.Accounts.User

  @impl true
  def token_config do
    default_claims(skip: [:aud, :iss, :jti, :nbf])
    |> add_claim("sub", nil, &is_binary/1)
    |> add_claim("phone", nil, &is_binary/1)
  end

  def generate(%User{id: id, phone: phone}) do
    ttl = auth_config(:access_token_ttl_seconds)
    claims = %{"sub" => id, "phone" => phone, "exp" => now() + ttl}

    with {:ok, token, _claims} <- generate_and_sign(claims, signer()) do
      {:ok, %{token: token, expires_in: ttl}}
    end
  end

  def verify_token(token) do
    verify_and_validate(token, signer())
  end

  defp signer do
    Joken.Signer.create("HS256", secret())
  end

  defp secret do
    auth_config(:jwt_secret)
  end

  defp auth_config(key) do
    Application.fetch_env!(:boton_backend, BotonBackend.Auth)
    |> Keyword.fetch!(key)
  end

  defp now, do: System.system_time(:second)
end
