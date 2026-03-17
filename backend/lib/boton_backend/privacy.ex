defmodule BotonBackend.Privacy do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Accounts.Profile
  alias BotonBackend.Alerts.Alert
  alias BotonBackend.Repo
  alias BotonBackend.Utils.Geohash

  @redacted_latitude 0.0
  @redacted_longitude 0.0
  @redacted_geohash Geohash.encode(@redacted_latitude, @redacted_longitude, 6)

  def profile_location_cutoff(now \\ DateTime.utc_now()) do
    DateTime.add(now, -ttl_seconds(:profile_location_ttl_seconds), :second)
  end

  def alert_location_cutoff(now \\ DateTime.utc_now()) do
    DateTime.add(now, -ttl_seconds(:alert_location_ttl_seconds), :second)
  end

  def profile_location_fresh?(profile, now \\ DateTime.utc_now())

  def profile_location_fresh?(%{location_updated_at: %DateTime{} = updated_at}, now) do
    DateTime.compare(updated_at, profile_location_cutoff(now)) != :lt
  end

  def profile_location_fresh?(_profile, _now), do: false

  def alert_location_redacted?(alert, now \\ DateTime.utc_now())

  def alert_location_redacted?(%{created_at: %DateTime{} = created_at}, now) do
    DateTime.compare(created_at, alert_location_cutoff(now)) == :lt
  end

  def alert_location_redacted?(_alert, _now), do: false

  def serialized_alert_location(alert, now \\ DateTime.utc_now()) do
    if alert_location_redacted?(alert, now) do
      %{
        latitude: @redacted_latitude,
        longitude: @redacted_longitude,
        geohash: @redacted_geohash
      }
    else
      %{
        latitude: alert.latitude,
        longitude: alert.longitude,
        geohash: alert.geohash
      }
    end
  end

  def clear_stale_profile_locations(now \\ DateTime.utc_now()) do
    cutoff = profile_location_cutoff(now)

    {count, _rows} =
      Profile
      |> where([profile], not is_nil(profile.location))
      |> where(
        [profile],
        is_nil(profile.location_updated_at) or profile.location_updated_at < ^cutoff
      )
      |> Repo.update_all(
        set: [
          location: nil,
          location_geohash: nil,
          location_updated_at: nil
        ]
      )

    count
  end

  def redact_stale_alert_locations(now \\ DateTime.utc_now()) do
    cutoff = alert_location_cutoff(now)

    {count, _rows} =
      Alert
      |> where([alert], alert.created_at < ^cutoff)
      |> where(
        [alert],
        alert.latitude != ^@redacted_latitude or alert.longitude != ^@redacted_longitude or
          alert.geohash != ^@redacted_geohash
      )
      |> Repo.update_all(
        set: [
          latitude: @redacted_latitude,
          longitude: @redacted_longitude,
          geohash: @redacted_geohash,
          location: point(@redacted_longitude, @redacted_latitude)
        ]
      )

    count
  end

  defp ttl_seconds(key) do
    Application.fetch_env!(:boton_backend, __MODULE__)
    |> Keyword.fetch!(key)
  end

  defp point(longitude, latitude) do
    %Geo.Point{coordinates: {longitude, latitude}, srid: 4326}
  end
end

defmodule BotonBackend.Privacy.RetentionWorker do
  @moduledoc false

  use Oban.Worker, queue: :default, max_attempts: 3

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    cleared_profiles = BotonBackend.Privacy.clear_stale_profile_locations()
    redacted_alerts = BotonBackend.Privacy.redact_stale_alert_locations()

    Logger.info(
      "Privacy retention ran: cleared_profiles=#{cleared_profiles} redacted_alerts=#{redacted_alerts}"
    )

    :ok
  end
end
