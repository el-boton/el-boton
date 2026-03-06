defmodule BotonBackendWeb.AlertControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  alias BotonBackend.Alerts.PushDeliveryAttempt

  test "circle members can create, respond to, message, and resolve alerts", %{conn: conn} do
    sender = user_fixture(%{display_name: "Sender"})
    responder = user_fixture(%{
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

    assert attempt = Repo.get_by(PushDeliveryAttempt, alert_id: alert_id, user_id: responder.user.id)
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
    nearby_user = user_fixture(%{
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
end
