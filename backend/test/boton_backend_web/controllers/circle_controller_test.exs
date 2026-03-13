defmodule BotonBackendWeb.CircleControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  test "users can create, join, and view circle members", %{conn: conn} do
    owner = user_fixture(%{display_name: "Owner"})
    member = user_fixture(%{display_name: "Member"})

    create_conn =
      conn
      |> auth_conn(owner.session)
      |> post(~p"/circles", %{name: "Family"})

    assert %{
             "id" => circle_id,
             "name" => "Family",
             "invite_code" => invite_code,
             "role" => "owner",
             "memberCount" => 1
           } = json_response(create_conn, 200)

    join_conn =
      build_conn()
      |> auth_conn(member.session)
      |> post(~p"/circles/join", %{invite_code: invite_code})

    assert %{"id" => ^circle_id, "role" => "member", "memberCount" => 2} =
             json_response(join_conn, 200)

    members_conn =
      build_conn()
      |> auth_conn(owner.session)
      |> get(~p"/circles/#{circle_id}/members")

    members = json_response(members_conn, 200)

    assert Enum.any?(members, &(&1["role"] == "owner" and &1["profile"]["display_name"] == "Owner"))
    assert Enum.any?(members, &(&1["role"] == "member" and &1["profile"]["display_name"] == "Member"))
    refute Enum.any?(members, &Map.has_key?(&1["profile"], "phone"))
    refute Enum.any?(members, &Map.has_key?(&1["profile"], "push_token"))
  end

  test "owners can remove members and delete the circle", %{conn: conn} do
    owner = user_fixture(%{display_name: "Owner"})
    member = user_fixture(%{display_name: "Member"})

    create_conn =
      conn
      |> auth_conn(owner.session)
      |> post(~p"/circles", %{name: "Neighbors"})

    %{"id" => circle_id, "invite_code" => invite_code} = json_response(create_conn, 200)

    build_conn()
    |> auth_conn(member.session)
    |> post(~p"/circles/join", %{invite_code: invite_code})
    |> json_response(200)

    leave_conn =
      build_conn()
      |> auth_conn(owner.session)
      |> delete(~p"/circles/#{circle_id}/members/me")

    assert %{"error" => %{"code" => "owner_cannot_leave"}} = json_response(leave_conn, 422)

    remove_conn =
      build_conn()
      |> auth_conn(owner.session)
      |> delete(~p"/circles/#{circle_id}/members/#{member.user.id}")

    assert response(remove_conn, 204)

    delete_conn =
      build_conn()
      |> auth_conn(owner.session)
      |> delete(~p"/circles/#{circle_id}")

    assert response(delete_conn, 204)
  end
end
