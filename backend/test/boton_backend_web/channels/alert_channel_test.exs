defmodule BotonBackendWeb.AlertChannelTest do
  use BotonBackendWeb.ChannelCase, async: true

  alias BotonBackend.Alerts
  alias BotonBackend.Circles
  alias BotonBackendWeb.{AlertChannel, UserAlertsChannel, UserSocket}

  test "authorized participants can join alert channels and receive updates" do
    sender = user_fixture(%{display_name: "Sender"})
    responder = user_fixture(%{display_name: "Responder"})
    outsider = user_fixture(%{display_name: "Outsider"})

    circle = circle_fixture(sender)
    {:ok, _circle} = Circles.join_circle(responder.user.id, circle.invite_code)
    {:ok, alert} = Alerts.create_alert(sender.user.id, 37.7749, -122.4194, request_context())
    alert_id = alert.id

    {:ok, sender_socket} = connect(UserSocket, %{"token" => sender.session.access_token})

    assert {:ok, _, joined_socket} =
             subscribe_and_join(sender_socket, AlertChannel, "alert:#{alert_id}")

    {:ok, outsider_socket} = connect(UserSocket, %{"token" => outsider.session.access_token})

    assert {:error, %{reason: "unauthorized"}} =
             subscribe_and_join(outsider_socket, AlertChannel, "alert:#{alert_id}")

    assert {:ok, :responded} =
             Alerts.respond_to_alert(responder.user.id, alert_id, "acknowledged")

    assert_push "responses.updated", %{responses: [%{status: "acknowledged"}]}

    assert {:ok, message} = Alerts.create_message(sender.user.id, alert_id, "Stay calm")
    assert message.message == "Stay calm"
    assert_push "message.inserted", %{message: %{message: "Stay calm"}}

    leave(joined_socket)
  end

  test "user alerts channels receive alert update notifications" do
    sender = user_fixture(%{display_name: "Sender"})
    responder = user_fixture(%{
      display_name: "Responder",
      push_token: "ExponentPushToken[responder]"
    })

    circle = circle_fixture(sender)
    {:ok, _circle} = Circles.join_circle(responder.user.id, circle.invite_code)
    {:ok, alert} = Alerts.create_alert(sender.user.id, 37.7749, -122.4194, request_context())
    alert_id = alert.id

    {:ok, responder_socket} =
      connect(UserSocket, %{"token" => responder.session.access_token})

    assert {:ok, _, _joined_socket} =
             subscribe_and_join(
               responder_socket,
               UserAlertsChannel,
               "user:#{responder.user.id}:alerts"
             )

    assert {:ok, _resolved_alert} = Alerts.resolve_alert(sender.user.id, alert_id)

    assert_push "alerts.updated", %{alert_id: ^alert_id}
  end
end
