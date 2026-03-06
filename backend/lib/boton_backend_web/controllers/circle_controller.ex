defmodule BotonBackendWeb.CircleController do
  use BotonBackendWeb, :controller

  alias BotonBackend.Circles
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
      {:ok, circle} -> json(conn, Serializers.circle_with_role(circle))
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def join(conn, %{"invite_code" => invite_code}) do
    user = conn.assigns.current_user

    case Circles.join_circle(user.id, invite_code) do
      {:ok, circle} -> json(conn, Serializers.circle_with_role(circle))
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def members(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.list_circle_members(user.id, circle_id) do
      {:ok, members} -> json(conn, Enum.map(members, &Serializers.circle_member/1))
      {:error, code, message} -> ControllerHelpers.error(conn, :not_found, code, message)
    end
  end

  def leave(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.leave_circle(user.id, circle_id) do
      {:ok, _} -> send_resp(conn, :no_content, "")
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def remove_member(conn, %{"id" => circle_id, "user_id" => member_user_id}) do
    user = conn.assigns.current_user

    case Circles.remove_member(user.id, circle_id, member_user_id) do
      {:ok, _} -> send_resp(conn, :no_content, "")
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end

  def delete(conn, %{"id" => circle_id}) do
    user = conn.assigns.current_user

    case Circles.delete_circle(user.id, circle_id) do
      {:ok, _} -> send_resp(conn, :no_content, "")
      {:error, code, message} -> ControllerHelpers.error(conn, :unprocessable_entity, code, message)
    end
  end
end
