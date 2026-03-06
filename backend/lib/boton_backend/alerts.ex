defmodule BotonBackend.Alerts do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Accounts
  alias BotonBackend.Alerts.{Alert, AlertMessage, AlertResponse}
  alias BotonBackend.Notifications
  alias BotonBackend.Repo
  alias BotonBackend.Utils.Geohash
  alias BotonBackendWeb.Endpoint
  alias BotonBackendWeb.Serializers
  alias Ecto.Multi

  @alert_rate_limit_window_seconds 900
  @alert_rate_limit_max 10

  def create_alert(user_id, latitude, longitude, context) do
    with :ok <- ensure_alert_rate_limit(user_id, context) do
      attrs = %{
        sender_id: user_id,
        latitude: latitude,
        longitude: longitude,
        geohash: Geohash.encode(latitude, longitude, 6),
        location: point(longitude, latitude),
        status: "active",
        expand_to_nearby: false
      }

      Multi.new()
      |> Multi.insert(:alert, Alert.changeset(%Alert{}, attrs))
      |> Notifications.put_alert_fanout_job(:fanout_job, fn %{alert: alert} ->
        BotonBackend.Notifications.AlertFanoutWorker.new(%{"alert_id" => alert.id})
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{alert: alert}} ->
          Accounts.record_audit("alert_created", %{user_id: user_id, ip_address: context.ip_address, metadata: %{alert_id: alert.id}})
          alert = Repo.preload(alert, sender: :profile)
          broadcast_alert_update(alert)
          broadcast_user_alerts(alert)
          {:ok, Serializers.alert(alert)}

        {:error, _step, changeset, _changes} ->
          {:error, :validation_failed, translate_error(changeset)}
      end
    end
  end

  def get_alert(user_id, alert_id) do
    accessible_alert(user_id, alert_id)
    |> case do
      nil -> {:error, :not_found, "Alert not found"}
      alert -> {:ok, Repo.preload(alert, sender: :profile)}
    end
  end

  def history_for_user(user_id) do
    accessible_alerts_query(user_id)
    |> order_by([alert], asc: fragment("CASE WHEN ? = 'active' THEN 0 ELSE 1 END", alert.status), desc: alert.created_at)
    |> Repo.all()
    |> Repo.preload(sender: :profile)
    |> Enum.map(&Serializers.alert_with_sender/1)
  end

  def cancel_alert(user_id, alert_id) do
    update_alert_state(user_id, alert_id, "cancelled")
  end

  def resolve_alert(user_id, alert_id) do
    update_alert_state(user_id, alert_id, "resolved")
  end

  def expand_alert(user_id, alert_id) do
    with %Alert{} = alert <- Repo.get(Alert, alert_id),
         true <- alert.sender_id == user_id do
      alert
      |> Ecto.Changeset.change(expand_to_nearby: true)
      |> Repo.update()
      |> case do
        {:ok, updated_alert} ->
          _job = Notifications.enqueue_alert_fanout(updated_alert.id)
          updated_alert = Repo.preload(updated_alert, sender: :profile)
          broadcast_alert_update(updated_alert)
          broadcast_user_alerts(updated_alert)
          {:ok, Serializers.alert(updated_alert)}

        {:error, changeset} ->
          {:error, :validation_failed, translate_error(changeset)}
      end
    else
      false -> {:error, :not_found, "Alert not found"}
      nil -> {:error, :not_found, "Alert not found"}
    end
  end

  def respond_to_alert(user_id, alert_id, status) do
    with {:ok, _alert} <- get_alert(user_id, alert_id) do
      attrs = %{
        alert_id: alert_id,
        responder_id: user_id,
        status: status,
        responded_at: DateTime.utc_now()
      }

      %AlertResponse{}
      |> AlertResponse.changeset(attrs)
      |> Repo.insert(
        on_conflict: [
          set: [
            status: status,
            responded_at: attrs.responded_at
          ]
        ],
        conflict_target: [:alert_id, :responder_id]
      )

      alert = Repo.get!(Alert, alert_id) |> Repo.preload(sender: :profile)
      broadcast_responses_updated(alert_id)
      broadcast_user_alerts(alert)
      {:ok, :responded}
    end
  end

  def list_responses(user_id, alert_id) do
    with {:ok, _alert} <- get_alert(user_id, alert_id) do
      AlertResponse
      |> where([response], response.alert_id == ^alert_id)
      |> Repo.all()
      |> Repo.preload(responder: :profile)
      |> Enum.map(&Serializers.alert_response/1)
      |> then(&{:ok, &1})
    end
  end

  def list_messages(user_id, alert_id) do
    with {:ok, _alert} <- get_alert(user_id, alert_id) do
      AlertMessage
      |> where([message], message.alert_id == ^alert_id)
      |> order_by([message], asc: message.created_at)
      |> Repo.all()
      |> Repo.preload(sender: :profile)
      |> Enum.map(&Serializers.alert_message/1)
      |> then(&{:ok, &1})
    end
  end

  def create_message(user_id, alert_id, message) do
    with {:ok, _alert} <- get_alert(user_id, alert_id) do
      %AlertMessage{}
      |> AlertMessage.changeset(%{
        alert_id: alert_id,
        sender_id: user_id,
        message: String.trim(message)
      })
      |> Repo.insert()
      |> case do
        {:ok, alert_message} ->
          alert_message = Repo.preload(alert_message, sender: :profile)
          broadcast_message_inserted(alert_id, alert_message)

          alert = Repo.get!(Alert, alert_id) |> Repo.preload(sender: :profile)
          broadcast_user_alerts(alert)

          {:ok, Serializers.alert_message(alert_message)}

        {:error, changeset} ->
          {:error, :validation_failed, translate_error(changeset)}
      end
    end
  end

  def authorized_for_alert?(user_id, alert_id) do
    accessible_alert(user_id, alert_id) != nil
  end

  defp update_alert_state(user_id, alert_id, status) do
    with %Alert{} = alert <- Repo.get(Alert, alert_id),
         true <- alert.sender_id == user_id do
      attrs =
        if status == "active" do
          %{status: status, resolved_at: nil}
        else
          %{status: status, resolved_at: DateTime.utc_now()}
        end

      alert
      |> Ecto.Changeset.change(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated_alert} ->
          updated_alert = Repo.preload(updated_alert, sender: :profile)
          broadcast_alert_update(updated_alert)
          broadcast_user_alerts(updated_alert)
          {:ok, Serializers.alert(updated_alert)}

        {:error, changeset} ->
          {:error, :validation_failed, translate_error(changeset)}
      end
    else
      false -> {:error, :not_found, "Alert not found"}
      nil -> {:error, :not_found, "Alert not found"}
    end
  end

  defp accessible_alert(user_id, alert_id) do
    accessible_alerts_query(user_id)
    |> where([alert], alert.id == ^alert_id)
    |> Repo.one()
  end

  defp accessible_alerts_query(user_id) do
    nearby_radius = auth_config(:nearby_radius_meters)
    profile = Accounts.get_profile(user_id)

    nearby_dynamic =
      if profile && profile.location do
        dynamic([alert], alert.expand_to_nearby and fragment("ST_DWithin(?, ?, ?)", alert.location, ^profile.location, ^nearby_radius))
      else
        dynamic(false)
      end

    shared_circle_dynamic =
      dynamic(
        [alert],
        fragment(
          """
          EXISTS (
            SELECT 1
            FROM circle_members sender_member
            JOIN circle_members viewer_member
              ON sender_member.circle_id = viewer_member.circle_id
            WHERE sender_member.user_id = ?
              AND viewer_member.user_id = ?
          )
          """,
          alert.sender_id,
          type(^user_id, :binary_id)
        )
      )

    responded_dynamic =
      dynamic(
        [alert],
        fragment(
          "EXISTS (SELECT 1 FROM alert_responses responses WHERE responses.alert_id = ? AND responses.responder_id = ?)",
          alert.id,
          type(^user_id, :binary_id)
        )
      )

    visibility_dynamic =
      dynamic(
        [alert],
        alert.sender_id == ^user_id or
          ^responded_dynamic or
          ^shared_circle_dynamic or
          ^nearby_dynamic
      )

    from(alert in Alert,
      where: ^visibility_dynamic
    )
  end

  defp ensure_alert_rate_limit(user_id, context) do
    recent_since = DateTime.add(DateTime.utc_now(), -@alert_rate_limit_window_seconds, :second)

    recent_count =
      BotonBackend.Accounts.AuditLog
      |> where([audit], audit.action == "alert_created" and audit.user_id == ^user_id and audit.recorded_at >= ^recent_since)
      |> Repo.aggregate(:count, :id)

    if recent_count >= @alert_rate_limit_max do
      {:error, :alert_rate_limited, "Too many alerts created in a short period"}
    else
      Accounts.record_audit("alert_rate_checked", %{user_id: user_id, ip_address: context.ip_address})
      :ok
    end
  end

  defp broadcast_alert_update(alert) do
    Endpoint.broadcast!("alert:#{alert.id}", "alert.updated", %{alert: Serializers.alert(alert)})
  end

  defp broadcast_responses_updated(alert_id) do
    responses =
      AlertResponse
      |> where([response], response.alert_id == ^alert_id)
      |> Repo.all()
      |> Repo.preload(responder: :profile)
      |> Enum.map(&Serializers.alert_response/1)

    Endpoint.broadcast!("alert:#{alert_id}", "responses.updated", %{responses: responses})
  end

  defp broadcast_message_inserted(alert_id, alert_message) do
    Endpoint.broadcast!("alert:#{alert_id}", "message.inserted", %{message: Serializers.alert_message(alert_message)})
  end

  defp broadcast_user_alerts(alert) do
    user_ids =
      ([alert.sender_id] ++ response_user_ids(alert.id) ++ Notifications.recipient_user_ids(alert))
      |> Enum.uniq()

    Enum.each(user_ids, fn user_id ->
      Endpoint.broadcast!("user:#{user_id}:alerts", "alerts.updated", %{alert_id: alert.id})
    end)
  end

  defp response_user_ids(alert_id) do
    AlertResponse
    |> where([response], response.alert_id == ^alert_id)
    |> select([response], response.responder_id)
    |> Repo.all()
  end

  defp translate_error(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
    |> Enum.flat_map(fn {_field, messages} -> messages end)
    |> List.first()
    |> Kernel.||("Validation failed")
  end

  defp auth_config(key) do
    Application.fetch_env!(:boton_backend, BotonBackend.Auth)
    |> Keyword.fetch!(key)
  end

  defp point(longitude, latitude) do
    %Geo.Point{coordinates: {longitude, latitude}, srid: 4326}
  end
end
