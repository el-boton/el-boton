defmodule BotonBackendWeb.Serializers do
  @moduledoc false

  def profile(nil), do: nil

  def profile(profile) do
    %{
      id: profile.id,
      display_name: profile.display_name,
      phone: profile.phone,
      push_token: profile.push_token,
      location_geohash: profile.location_geohash,
      location_updated_at: profile.location_updated_at,
      created_at: profile.created_at
    }
  end

  def alert(alert) do
    %{
      id: alert.id,
      sender_id: alert.sender_id,
      latitude: alert.latitude,
      longitude: alert.longitude,
      geohash: alert.geohash,
      status: alert.status,
      expand_to_nearby: alert.expand_to_nearby,
      created_at: alert.created_at,
      resolved_at: alert.resolved_at
    }
  end

  def alert_with_sender(alert) do
    alert(alert)
    |> Map.put(:sender, sender_profile(alert))
  end

  def alert_response(response) do
    %{
      alert_id: response.alert_id,
      responder_id: response.responder_id,
      status: response.status,
      responded_at: response.responded_at,
      responder: sender_profile(response)
    }
  end

  def alert_message(message) do
    %{
      id: message.id,
      alert_id: message.alert_id,
      sender_id: message.sender_id,
      message: message.message,
      created_at: message.created_at,
      sender: sender_profile(message)
    }
  end

  def circle_with_role(circle) do
    %{
      id: circle.id,
      name: circle.name,
      created_by: circle.created_by,
      invite_code: circle.invite_code,
      created_at: circle.created_at,
      role: circle.role,
      memberCount: circle.memberCount
    }
  end

  def circle_member(member) do
    %{
      circle_id: member.circle_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      profile: circle_member_profile(member.profile)
    }
  end

  def session(session) do
    %{
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      user: session.user
    }
  end

  defp sender_profile(%{sender: %{profile: profile}}), do: display_profile(profile)
  defp sender_profile(%{responder: %{profile: profile}}), do: display_profile(profile)
  defp sender_profile(%{sender_profile: profile}), do: display_profile(profile)
  defp sender_profile(%{responder_profile: profile}), do: display_profile(profile)
  defp sender_profile(%{profile: profile}), do: display_profile(profile)
  defp sender_profile(_), do: nil

  defp circle_member_profile(nil), do: nil

  defp circle_member_profile(profile) do
    %{
      id: profile.id,
      display_name: profile.display_name
    }
  end

  defp display_profile(nil), do: nil

  defp display_profile(profile) do
    %{
      display_name: profile.display_name
    }
  end
end
