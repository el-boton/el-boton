defmodule BotonBackendWeb.MeControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  alias BotonBackend.Accounts

  test "shows and updates the current profile", %{conn: conn} do
    %{session: session} = user_fixture(%{display_name: "Initial Name"})

    show_conn = conn |> auth_conn(session) |> get(~p"/me/profile")

    assert %{
             "id" => user_id,
             "display_name" => "Initial Name",
             "phone" => phone
           } = json_response(show_conn, 200)

    assert is_binary(user_id)
    assert String.starts_with?(phone, "+1")

    update_conn =
      build_conn()
      |> auth_conn(session)
      |> patch(~p"/me/profile", %{
        display_name: "Updated Name",
        push_token: "ExponentPushToken[test]"
      })

    assert %{
             "display_name" => "Updated Name",
             "push_token" => "ExponentPushToken[test]"
           } = json_response(update_conn, 200)
  end

  test "updates the current location", %{conn: conn} do
    %{session: session, user: user} = user_fixture()

    location_conn =
      conn
      |> auth_conn(session)
      |> put(~p"/me/location", %{latitude: 37.7749, longitude: -122.4194})

    assert %{
             "location_geohash" => geohash,
             "location_updated_at" => location_updated_at
           } = json_response(location_conn, 200)

    assert is_binary(geohash)
    assert byte_size(geohash) == 6
    assert is_binary(location_updated_at)
    assert Accounts.get_profile(user.id).location != nil
  end

  test "deletes the current account", %{conn: conn} do
    %{session: session, user: user} = user_fixture()

    delete_conn = conn |> auth_conn(session) |> delete(~p"/me")

    assert response(delete_conn, 204)
    refute Accounts.get_user(user.id)

    unauthorized_conn =
      build_conn()
      |> auth_conn(session)
      |> get(~p"/me/profile")

    assert %{"error" => %{"code" => "unauthorized"}} = json_response(unauthorized_conn, 401)
  end
end
