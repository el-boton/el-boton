defmodule BotonBackendWeb.AlertControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  import Ecto.Query

  alias BotonBackend.Accounts
  alias BotonBackend.Accounts.Profile
  alias BotonBackend.Alerts.{Alert, PushDeliveryAttempt}

  test "circle members can create, respond to, message, and resolve alerts", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    responder =
      user_fixture(%{
        display_name: "Responder",
        push_token: "ExponentPushToken[responder]"
      })

    circle_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/circles", %{name: "Family"})

    %{"invite_code" => invite_code} = json_response(circle_conn, 200)

    build_conn()
    |> auth_conn(responder.session)
    |> post(~p"/circles/join", %{invite_code: invite_code})
    |> json_response(200)

    create_alert_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    assert %{
             "id" => alert_id,
             "status" => "active"
           } = json_response(create_alert_conn, 200)

    assert attempt =
             Repo.get_by(PushDeliveryAttempt, alert_id: alert_id, user_id: responder.user.id)

    assert attempt.status == "skipped"

    history_conn =
      build_conn()
      |> auth_conn(responder.session)
      |> get(~p"/alerts/history")

    assert Enum.any?(json_response(history_conn, 200), &(&1["id"] == alert_id))

    respond_conn =
      build_conn()
      |> auth_conn(responder.session)
      |> put(~p"/alerts/#{alert_id}/response", %{status: "en_route"})

    assert response(respond_conn, 204)

    responses_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> get(~p"/alerts/#{alert_id}/responses")

    assert [
             %{
               "status" => "en_route",
               "responder_id" => responder_id,
               "responder" => %{"display_name" => "Responder"}
             }
           ] = json_response(responses_conn, 200)

    assert responder_id == responder.user.id

    message_conn =
      build_conn()
      |> auth_conn(responder.session)
      |> post(~p"/alerts/#{alert_id}/messages", %{message: "On my way"})

    assert %{"alert_id" => ^alert_id, "message" => "On my way"} =
             json_response(message_conn, 200)

    messages_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> get(~p"/alerts/#{alert_id}/messages")

    assert [%{"message" => "On my way"}] = json_response(messages_conn, 200)

    resolve_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts/#{alert_id}/resolve", %{})

    assert %{"id" => ^alert_id, "status" => "resolved"} = json_response(resolve_conn, 200)
  end

  test "expanded alerts become visible to nearby users", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    nearby_user =
      user_fixture(%{
        display_name: "Nearby User",
        latitude: 37.7750,
        longitude: -122.4195
      })

    create_alert_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    %{"id" => alert_id} = json_response(create_alert_conn, 200)

    initial_history_conn =
      build_conn()
      |> auth_conn(nearby_user.session)
      |> get(~p"/alerts/history")

    assert json_response(initial_history_conn, 200) == []

    expand_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts/#{alert_id}/expand", %{})

    assert %{"id" => ^alert_id, "expand_to_nearby" => true} = json_response(expand_conn, 200)

    expanded_history_conn =
      build_conn()
      |> auth_conn(nearby_user.session)
      |> get(~p"/alerts/history")

    assert Enum.any?(json_response(expanded_history_conn, 200), &(&1["id"] == alert_id))
  end

  test "moving near an alert after expansion does not grant retroactive access", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    distant_user =
      user_fixture(%{
        display_name: "Distant User",
        latitude: 40.7128,
        longitude: -74.0060
      })

    create_alert_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    %{"id" => alert_id} = json_response(create_alert_conn, 200)

    expand_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts/#{alert_id}/expand", %{})

    assert %{"id" => ^alert_id, "expand_to_nearby" => true} = json_response(expand_conn, 200)

    initial_history_conn =
      build_conn()
      |> auth_conn(distant_user.session)
      |> get(~p"/alerts/history")

    assert json_response(initial_history_conn, 200) == []

    {:ok, _profile} = Accounts.update_location(distant_user.user.id, 37.7750, -122.4195)

    moved_history_conn =
      build_conn()
      |> auth_conn(distant_user.session)
      |> get(~p"/alerts/history")

    assert json_response(moved_history_conn, 200) == []
  end

  test "expanding an alert only fans out to newly nearby recipients", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    circle_member =
      user_fixture(%{
        display_name: "Circle Member",
        push_token: "ExponentPushToken[circle-member]"
      })

    nearby_user =
      user_fixture(%{
        display_name: "Nearby User",
        push_token: "ExponentPushToken[nearby-user]",
        latitude: 37.7750,
        longitude: -122.4195
      })

    circle_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/circles", %{name: "Family"})

    %{"invite_code" => invite_code} = json_response(circle_conn, 200)

    build_conn()
    |> auth_conn(circle_member.session)
    |> post(~p"/circles/join", %{invite_code: invite_code})
    |> json_response(200)

    create_alert_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    %{"id" => alert_id} = json_response(create_alert_conn, 200)

    initial_attempts =
      PushDeliveryAttempt
      |> Repo.all()
      |> Enum.filter(&(&1.alert_id == alert_id))

    assert Enum.map(initial_attempts, & &1.user_id) == [circle_member.user.id]

    expand_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts/#{alert_id}/expand", %{})

    assert %{"id" => ^alert_id, "expand_to_nearby" => true} = json_response(expand_conn, 200)

    attempts_after_expand =
      PushDeliveryAttempt
      |> Repo.all()
      |> Enum.filter(&(&1.alert_id == alert_id))

    assert Enum.count(attempts_after_expand, &(&1.user_id == circle_member.user.id)) == 1
    assert Enum.count(attempts_after_expand, &(&1.user_id == nearby_user.user.id)) == 1
  end

  test "expanded alerts ignore stale stored profile locations", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    nearby_user =
      user_fixture(%{
        display_name: "Nearby User",
        latitude: 37.7750,
        longitude: -122.4195
      })

    stale_updated_at = DateTime.add(DateTime.utc_now(), -(8 * 24 * 60 * 60), :second)

    Profile
    |> where([profile], profile.id == ^nearby_user.user.id)
    |> Repo.update_all(set: [location_updated_at: stale_updated_at])

    create_alert_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    %{"id" => alert_id} = json_response(create_alert_conn, 200)

    expand_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> post(~p"/alerts/#{alert_id}/expand", %{})

    assert %{"id" => ^alert_id, "expand_to_nearby" => true} = json_response(expand_conn, 200)

    history_conn =
      build_conn()
      |> auth_conn(nearby_user.session)
      |> get(~p"/alerts/history")

    assert json_response(history_conn, 200) == []
  end

  test "alerts older than seven days serialize redacted coordinates", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})

    create_alert_conn =
      conn
      |> auth_conn(sender.session)
      |> post(~p"/alerts", %{latitude: 37.7749, longitude: -122.4194})

    %{"id" => alert_id} = json_response(create_alert_conn, 200)

    stale_created_at = DateTime.add(DateTime.utc_now(), -(8 * 24 * 60 * 60), :second)

    Alert
    |> where([alert], alert.id == ^alert_id)
    |> Repo.update_all(set: [created_at: stale_created_at])

    show_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> get(~p"/alerts/#{alert_id}")

    show_payload = json_response(show_conn, 200)

    assert show_payload["id"] == alert_id
    assert_in_delta show_payload["latitude"], 0.0, 0.0
    assert_in_delta show_payload["longitude"], 0.0, 0.0

    history_conn =
      build_conn()
      |> auth_conn(sender.session)
      |> get(~p"/alerts/history")

    assert Enum.any?(json_response(history_conn, 200), fn alert ->
             alert["id"] == alert_id and
               abs(alert["latitude"]) == 0.0 and
               abs(alert["longitude"]) == 0.0
           end)
  end
end
