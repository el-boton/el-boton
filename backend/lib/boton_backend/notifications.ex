defmodule BotonBackend.Notifications do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Accounts.Profile
  alias BotonBackend.Alerts.{Alert, PushDeliveryAttempt}
  alias BotonBackend.Circles
  alias BotonBackend.Repo
  alias Ecto.Multi

  def put_alert_fanout_job(%Multi{} = multi, multi_name, changeset_or_fun) do
    Oban.insert(multi, multi_name, changeset_or_fun)
  end

  def enqueue_alert_fanout(alert_id) do
    Oban.insert(BotonBackend.Notifications.AlertFanoutWorker.new(%{"alert_id" => alert_id}))
  end

  def fanout_alert(%Alert{} = alert) do
    recipients = recipient_profiles(alert)

    if recipients == [] do
      :ok
    else
      deliver_alert(alert, recipients)
    end
  end

  def recipient_user_ids(%Alert{} = alert) do
    recipient_profiles(alert)
    |> Enum.map(& &1.user_id)
    |> Enum.uniq()
  end

  def nearby_user_ids(%Alert{} = alert) do
    if alert.expand_to_nearby do
      radius = Application.fetch_env!(:boton_backend, BotonBackend.Auth) |> Keyword.fetch!(:nearby_radius_meters)

      Profile
      |> where([profile], profile.id != ^alert.sender_id)
      |> where([profile], not is_nil(profile.location))
      |> where([profile], fragment("ST_DWithin(?, ?, ?)", profile.location, ^alert.location, ^radius))
      |> select([profile], profile.id)
      |> Repo.all()
    else
      []
    end
  end

  defp recipient_profiles(%Alert{} = alert) do
    user_ids =
      (Circles.sender_circle_member_ids(alert.sender_id) ++ nearby_user_ids(alert))
      |> Enum.uniq()

    Profile
    |> where([profile], profile.id in ^user_ids)
    |> where([profile], not is_nil(profile.push_token))
    |> select([profile], %{user_id: profile.id, push_token: profile.push_token})
    |> Repo.all()
  end

  defp deliver_alert(alert, recipients) do
    config = Application.fetch_env!(:boton_backend, BotonBackend.Notifications.ExpoClient)
    enabled? = Keyword.get(config, :enabled, true)
    sender = alert.sender.profile
    sender_name = sender.display_name || alert.sender.phone || "Someone"

    if enabled? do
      messages =
        Enum.map(recipients, fn recipient ->
          %{
            to: recipient.push_token,
            sound: "alarm.wav",
            title: "EMERGENCY ALERT",
            body: "#{sender_name} needs help!",
            priority: "high",
            channelId: "alerts",
            interruptionLevel: "critical",
            data: %{
              alertId: alert.id,
              type: "emergency",
              latitude: alert.latitude,
              longitude: alert.longitude
            }
          }
        end)

      response =
        Req.post!(
          Keyword.fetch!(config, :endpoint),
          json: messages,
          headers: [accept: "application/json"]
        )

      Enum.each(recipients, fn recipient ->
        record_delivery_attempt(alert.id, recipient, "sent", response.body, nil)
      end)
    else
      Enum.each(recipients, fn recipient ->
        record_delivery_attempt(alert.id, recipient, "skipped", %{enabled: false}, nil)
      end)
    end

    :ok
  rescue
    error ->
      Enum.each(recipients, fn recipient ->
        record_delivery_attempt(alert.id, recipient, "failed", nil, Exception.message(error))
      end)

      {:error, :push_delivery_failed}
  end

  defp record_delivery_attempt(alert_id, recipient, status, response_body, error_message) do
    %PushDeliveryAttempt{}
    |> PushDeliveryAttempt.changeset(%{
      alert_id: alert_id,
      user_id: recipient.user_id,
      push_token: recipient.push_token,
      status: status,
      response_body: response_body,
      error_message: error_message
    })
    |> Repo.insert()
  end
end

defmodule BotonBackend.Notifications.AlertFanoutWorker do
  @moduledoc false

  use Oban.Worker, queue: :push, max_attempts: 5

  alias BotonBackend.Alerts.Alert
  alias BotonBackend.Repo
  alias BotonBackend.Notifications

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"alert_id" => alert_id}}) do
    alert =
      Alert
      |> Repo.get!(alert_id)
      |> Repo.preload(sender: :profile)

    case Notifications.fanout_alert(alert) do
      :ok -> :ok
      {:error, _reason} = error -> error
    end
  end
end
