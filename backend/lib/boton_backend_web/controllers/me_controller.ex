defmodule BotonBackendWeb.MeController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Accounts
  alias BotonBackendWeb.ControllerHelpers
  alias BotonBackendWeb.Serializers

  def show(conn, _params) do
    user = conn.assigns.current_user

    case Accounts.get_profile(user.id) do
      nil -> ControllerHelpers.error(conn, :not_found, :not_found, "Profile not found")
      profile -> json(conn, Serializers.profile(profile))
    end
  end

  def update(conn, params) do
    user = conn.assigns.current_user

    attrs =
      params
      |> Map.take(["display_name", "push_token", "location_geohash", "location_updated_at"])
      |> Enum.into(%{}, fn {key, value} -> {String.to_existing_atom(key), value} end)

    case Accounts.update_profile(user.id, attrs) do
      {:ok, profile} ->
        json(conn, Serializers.profile(profile))

      {:error, changeset} ->
        ControllerHelpers.error(
          conn,
          :unprocessable_entity,
          :validation_failed,
          "Profile update failed",
          changeset.errors
        )
    end
  end

  def update_location(conn, %{"latitude" => latitude, "longitude" => longitude}) do
    user = conn.assigns.current_user

    case Accounts.update_location(user.id, latitude, longitude) do
      {:ok, profile} ->
        json(conn, Serializers.profile(profile))

      {:error, changeset} ->
        ControllerHelpers.error(
          conn,
          :unprocessable_entity,
          :validation_failed,
          "Location update failed",
          changeset.errors
        )
    end
  end

  def delete(conn, _params) do
    user = conn.assigns.current_user

    case Accounts.delete_account(user.id, ControllerHelpers.request_context(conn)) do
      :ok ->
        send_resp(conn, :no_content, "")

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end
end
