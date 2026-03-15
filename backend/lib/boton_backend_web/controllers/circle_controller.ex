defmodule BotonBackendWeb.CircleController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Circles
  alias BotonBackend.Notifications
  alias BotonBackendWeb.ControllerHelpers
  alias BotonBackendWeb.Serializers

  def index(conn, _params) do
    user = conn.assigns.current_user

    Circles.list_circles_for_user(user.id)
    |> Enum.map(&Serializers.circle_with_role/1)
    |> then(&json(conn, &1))
  end

  def create(conn, %{"name" => name}) do
    user = conn.assigns.current_user

    case Circles.create_circle(user.id, name) do
      {:ok, circle} ->
        json(conn, Serializers.circle_with_role(circle))

      {:error, :circle_limit_reached, message} ->
        ControllerHelpers.error(conn, :too_many_requests, :circle_limit_reached, message)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def join(conn, %{"invite_code" => invite_code}) do
    user = conn.assigns.current_user

    case Circles.join_circle(user.id, invite_code) do
      {:ok, circle} ->
        json(conn, Serializers.circle_with_role(circle))

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def members(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.list_circle_members(user.id, circle_id) do
      {:ok, members} -> json(conn, Enum.map(members, &Serializers.circle_member/1))
      {:error, code, message} -> ControllerHelpers.error(conn, :not_found, code, message)
    end
  end

  def test_alert(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    with :ok <- Circles.ensure_member(circle_id, user.id),
         :ok <- Notifications.send_test_alert(circle_id, user) do
      json(conn, %{ok: true})
    else
      {:error, :not_found, message} ->
        ControllerHelpers.error(conn, :not_found, :not_found, message)

      {:error, :test_alert_rate_limited, message} ->
        ControllerHelpers.error(conn, :too_many_requests, :test_alert_rate_limited, message)

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def leave(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.leave_circle(user.id, circle_id) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def remove_member(conn, %{"id" => circle_id, "user_id" => member_user_id}) do
    user = conn.assigns.current_user

    case Circles.remove_member(user.id, circle_id, member_user_id) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def delete(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.delete_circle(user.id, circle_id) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, code, message} ->
        ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end
end
