defmodule BotonBackend.Notifications do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Accounts.Profile
  alias BotonBackend.Alerts.{Alert, AlertRecipient, PushDeliveryAttempt}
  alias BotonBackend.Repo
  alias Ecto.Multi
  alias Req.Response

  @expo_max_messages_per_request 100
  @terminal_delivery_statuses ["sent", "skipped"]

  def put_alert_fanout_job(%Multi{} = multi, multi_name, changeset_or_fun) do
    Oban.insert(multi, multi_name, changeset_or_fun)
  end

  def alert_fanout_job_args(alert_id, recipient_ids \\ nil) do
    %{"alert_id" => alert_id}
    |> maybe_put_recipient_ids(recipient_ids)
  end

  def enqueue_alert_fanout(alert_id, recipient_ids \\ nil) do
    Oban.insert(
      BotonBackend.Notifications.AlertFanoutWorker.new(
        alert_fanout_job_args(alert_id, recipient_ids)
      )
    )
  end

  def fanout_alert(%Alert{} = alert, opts \\ []) do
    recipient_ids = Keyword.get(opts, :recipient_ids)

    recipients =
      if alert.status == "active", do: recipient_profiles(alert, recipient_ids), else: []

    if recipients == [] do
      :ok
    else
      deliver_alert(alert, recipients)
    end
  end

  def recipient_user_ids(%Alert{} = alert) do
    AlertRecipient
    |> where([recipient], recipient.alert_id == ^alert.id)
    |> select([recipient], recipient.user_id)
    |> Repo.all()
  end

  def nearby_user_ids(%Alert{} = alert) do
    if alert.expand_to_nearby do
      radius =
        Application.fetch_env!(:boton_backend, BotonBackend.Auth)
        |> Keyword.fetch!(:nearby_radius_meters)

      Profile
      |> where([profile], profile.id != ^alert.sender_id)
      |> where([profile], not is_nil(profile.location))
      |> where(
        [profile],
        fragment("ST_DWithin(?, ?, ?)", profile.location, ^alert.location, ^radius)
      )
      |> select([profile], profile.id)
      |> Repo.all()
    else
      []
    end
  end

  defp recipient_profiles(%Alert{} = alert, recipient_ids) do
    user_ids =
      case recipient_ids do
        nil -> recipient_user_ids(alert)
        ids -> Enum.uniq(ids)
      end

    Profile
    |> where([profile], profile.id in ^user_ids)
    |> where([profile], not is_nil(profile.push_token))
    |> where([profile], profile.id not in subquery(successful_attempt_user_ids_query(alert.id)))
    |> select([profile], %{user_id: profile.id, push_token: profile.push_token})
    |> Repo.all()
  end

  defp deliver_alert(alert, recipients) do
    config = Application.fetch_env!(:boton_backend, BotonBackend.Notifications.ExpoClient)
    enabled? = Keyword.get(config, :enabled, true)
    sender_name = alert_sender_name(alert)

    if enabled? do
      recipients
      |> Enum.chunk_every(@expo_max_messages_per_request)
      |> Enum.reduce_while(:ok, fn chunk, :ok ->
        case deliver_chunk(config, alert, sender_name, chunk) do
          :ok -> {:cont, :ok}
          {:error, _reason} = error -> {:halt, error}
        end
      end)
    else
      recipients
      |> build_delivery_attempts(alert.id, "skipped", %{enabled: false}, nil)
      |> insert_delivery_attempts()

      :ok
    end
  rescue
    error ->
      recipients
      |> build_delivery_attempts(alert.id, "failed", nil, Exception.message(error))
      |> insert_delivery_attempts()

      {:error, :push_delivery_failed}
  end

  defp deliver_chunk(config, alert, sender_name, recipients) do
    messages = Enum.map(recipients, &expo_message(alert, sender_name, &1))

    case Req.post(Keyword.fetch!(config, :endpoint),
           json: messages,
           headers: expo_headers(config),
           retry: false
         ) do
      {:ok, %Response{status: status, body: body}} when status in 200..299 ->
        with {:ok, response_entries} <- extract_response_entries(body) do
          recipients
          |> zip_delivery_attempts(alert.id, response_entries)
          |> insert_delivery_attempts()

          :ok
        else
          {:error, message} ->
            recipients
            |> build_delivery_attempts(alert.id, "failed", body, message)
            |> insert_delivery_attempts()

            {:error, :push_delivery_failed}
        end

      {:ok, %Response{status: status, body: body}} ->
        recipients
        |> build_delivery_attempts(
          alert.id,
          "failed",
          body,
          "Expo push request failed with status #{status}"
        )
        |> insert_delivery_attempts()

        {:error, :push_delivery_failed}

      {:error, error} ->
        recipients
        |> build_delivery_attempts(alert.id, "failed", nil, Exception.message(error))
        |> insert_delivery_attempts()

        {:error, :push_delivery_failed}
    end
  end

  defp successful_attempt_user_ids_query(alert_id) do
    PushDeliveryAttempt
    |> where(
      [attempt],
      attempt.alert_id == ^alert_id and attempt.status in ^@terminal_delivery_statuses
    )
    |> select([attempt], attempt.user_id)
  end

  defp expo_headers(config) do
    auth_headers =
      case Keyword.get(config, :access_token) do
        nil -> []
        token -> [{"authorization", "Bearer #{token}"}]
      end

    [{"accept", "application/json"} | auth_headers]
  end

  defp expo_message(alert, sender_name, recipient) do
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
  end

  defp alert_sender_name(alert) do
    sender = alert.sender.profile
    sender.display_name || alert.sender.phone || "Someone"
  end

  defp extract_response_entries(%{"data" => response_entries}) when is_list(response_entries),
    do: {:ok, response_entries}

  defp extract_response_entries(_body), do: {:error, "Unexpected Expo push response payload"}

  defp zip_delivery_attempts(recipients, alert_id, response_entries) do
    if length(recipients) == length(response_entries) do
      attempted_at = DateTime.utc_now()

      Enum.zip(recipients, response_entries)
      |> Enum.map(fn {recipient, response_entry} ->
        {status, error_message} = delivery_result(response_entry)

        %{
          alert_id: alert_id,
          user_id: recipient.user_id,
          push_token: recipient.push_token,
          status: status,
          response_body: response_entry,
          error_message: error_message,
          attempted_at: attempted_at
        }
      end)
    else
      build_delivery_attempts(
        recipients,
        alert_id,
        "failed",
        %{"data" => response_entries},
        "Expo push response count did not match the request count"
      )
    end
  end

  defp delivery_result(%{"status" => "ok"}), do: {"sent", nil}

  defp delivery_result(%{"status" => "error"} = response_entry) do
    details =
      response_entry
      |> Map.get("details", %{})
      |> Jason.encode!()

    error_message =
      [Map.get(response_entry, "message"), details]
      |> Enum.reject(&is_nil_or_blank/1)
      |> Enum.join(" | ")

    {"failed",
     if(error_message == "", do: "Expo rejected the push notification", else: error_message)}
  end

  defp delivery_result(_response_entry),
    do: {"failed", "Expo returned an unknown delivery status"}

  defp build_delivery_attempts(recipients, alert_id, status, response_body, error_message) do
    attempted_at = DateTime.utc_now()

    Enum.map(recipients, fn recipient ->
      %{
        alert_id: alert_id,
        user_id: recipient.user_id,
        push_token: recipient.push_token,
        status: status,
        response_body: response_body,
        error_message: error_message,
        attempted_at: attempted_at
      }
    end)
  end

  defp insert_delivery_attempts([]), do: :ok

  defp insert_delivery_attempts(entries) do
    Repo.insert_all(PushDeliveryAttempt, entries)
    :ok
  end

  defp maybe_put_recipient_ids(args, nil), do: args
  defp maybe_put_recipient_ids(args, []), do: args

  defp maybe_put_recipient_ids(args, recipient_ids),
    do: Map.put(args, "recipient_ids", Enum.uniq(recipient_ids))

  defp is_nil_or_blank(nil), do: true
  defp is_nil_or_blank(""), do: true
  defp is_nil_or_blank(_value), do: false
end

defmodule BotonBackend.Notifications.AlertFanoutWorker do
  @moduledoc false

  use Oban.Worker, queue: :push, max_attempts: 5

  alias BotonBackend.Alerts.Alert
  alias BotonBackend.Repo
  alias BotonBackend.Notifications

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"alert_id" => alert_id} = args}) do
    alert =
      Alert
      |> Repo.get!(alert_id)
      |> Repo.preload(sender: :profile)

    case Notifications.fanout_alert(alert, recipient_ids: Map.get(args, "recipient_ids")) do
      :ok -> :ok
      {:error, _reason} = error -> error
    end
  end
end
