NimbleCSV.define(BotonBackend.Importers.SupabaseCSV, separator: ",", escape: "\"")

defmodule BotonBackend.Importers.Supabase do
  @moduledoc false

  alias BotonBackend.Accounts.{Profile, User}
  alias BotonBackend.Alerts.{Alert, AlertMessage, AlertResponse}
  alias BotonBackend.Circles.{Circle, CircleMember}
  alias BotonBackend.Repo

  @datasets %{
    users: ["users", "auth_users", "auth.users"],
    profiles: ["profiles"],
    circles: ["circles"],
    circle_members: ["circle_members"],
    alerts: ["alerts"],
    alert_responses: ["alert_responses"],
    alert_messages: ["alert_messages"]
  }

  @extensions [".json", ".jsonl", ".ndjson", ".csv"]

  def dataset_names, do: Map.keys(@datasets)

  def resolve_paths(options) do
    dir = Map.get(options, :dir)

    Enum.reduce(@datasets, %{}, fn {dataset, candidates}, acc ->
      explicit_path = Map.get(options, dataset)
      dataset_path = explicit_path || find_dataset_file(dir, candidates)

      if dataset_path do
        Map.put(acc, dataset, dataset_path)
      else
        acc
      end
    end)
  end

  def import_from_paths(paths) when is_map(paths) do
    if !Map.has_key?(paths, :users) do
      raise ArgumentError, "a users export is required to preserve Supabase auth UUIDs"
    end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    datasets =
      Enum.into(paths, %{}, fn {dataset, path} ->
        {dataset, load_records(path)}
      end)

    Repo.transaction(fn ->
      %{}
      |> put_count(:users, upsert_users(Map.get(datasets, :users, []), now))
      |> put_count(:profiles, upsert_profiles(Map.get(datasets, :profiles, []), now))
      |> put_count(:circles, upsert_circles(Map.get(datasets, :circles, []), now))
      |> put_count(
        :circle_members,
        upsert_circle_members(Map.get(datasets, :circle_members, []), now)
      )
      |> put_count(:alerts, upsert_alerts(Map.get(datasets, :alerts, []), now))
      |> put_count(
        :alert_responses,
        upsert_alert_responses(Map.get(datasets, :alert_responses, []), now)
      )
      |> put_count(
        :alert_messages,
        upsert_alert_messages(Map.get(datasets, :alert_messages, []), now)
      )
    end)
    |> case do
      {:ok, counts} -> counts
      {:error, reason} -> raise "supabase import failed: #{inspect(reason)}"
    end
  end

  defp load_records(path) do
    case Path.extname(path) do
      ".json" ->
        path
        |> File.read!()
        |> Jason.decode!()
        |> normalize_json_records(path)

      ext when ext in [".jsonl", ".ndjson"] ->
        path
        |> File.stream!()
        |> Stream.map(&String.trim/1)
        |> Stream.reject(&(&1 == ""))
        |> Enum.map(&Jason.decode!/1)

      ".csv" ->
        [header | rows] =
          path
          |> File.stream!()
          |> BotonBackend.Importers.SupabaseCSV.parse_stream()
          |> Enum.to_list()

        Enum.map(rows, fn row ->
          header
          |> Enum.zip(row)
          |> Map.new(fn {key, value} -> {key, value} end)
        end)

      extension ->
        raise ArgumentError, "unsupported import format #{extension} for #{path}"
    end
  end

  defp normalize_json_records(records, _path) when is_list(records), do: records

  defp normalize_json_records(%{"data" => records}, path) when is_list(records) do
    normalize_json_records(records, path)
  end

  defp normalize_json_records(_records, path) do
    raise ArgumentError, "expected #{path} to contain a JSON array of records"
  end

  defp upsert_users([], _now), do: 0

  defp upsert_users(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        phone = required_string!(row, "phone")

        %{
          id: required_string!(row, "id"),
          phone: phone,
          inserted_at: datetime_or_now(fetch(row, "created_at") || fetch(row, "inserted_at"), now),
          updated_at:
            datetime_or_now(
              fetch(row, "updated_at") || fetch(row, "created_at") || fetch(row, "inserted_at"),
              now
            )
        }
      end)

    {count, _} =
      Repo.insert_all(
        User,
        entries,
        on_conflict: {:replace, [:phone, :updated_at]},
        conflict_target: [:id]
      )

    count
  end

  defp upsert_profiles([], _now), do: 0

  defp upsert_profiles(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        %{
          id: required_string!(row, "id"),
          display_name: string_or_nil(fetch(row, "display_name")),
          phone: string_or_nil(fetch(row, "phone")),
          push_token: string_or_nil(fetch(row, "push_token")),
          location_geohash: string_or_nil(fetch(row, "location_geohash")),
          location_updated_at: datetime_or_nil(fetch(row, "location_updated_at")),
          created_at: datetime_or_now(fetch(row, "created_at"), now)
        }
      end)

    {count, _} =
      Repo.insert_all(
        Profile,
        entries,
        on_conflict:
          {:replace,
           [:display_name, :phone, :push_token, :location_geohash, :location_updated_at, :created_at]},
        conflict_target: [:id]
      )

    count
  end

  defp upsert_circles([], _now), do: 0

  defp upsert_circles(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        %{
          id: required_string!(row, "id"),
          name: required_string!(row, "name"),
          created_by: required_string!(row, "created_by"),
          invite_code: required_string!(row, "invite_code"),
          created_at: datetime_or_now(fetch(row, "created_at"), now)
        }
      end)

    {count, _} =
      Repo.insert_all(
        Circle,
        entries,
        on_conflict: {:replace, [:name, :created_by, :invite_code, :created_at]},
        conflict_target: [:id]
      )

    count
  end

  defp upsert_circle_members([], _now), do: 0

  defp upsert_circle_members(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        %{
          circle_id: required_string!(row, "circle_id"),
          user_id: required_string!(row, "user_id"),
          role: required_string!(row, "role"),
          joined_at: datetime_or_now(fetch(row, "joined_at"), now)
        }
      end)

    {count, _} =
      Repo.insert_all(
        CircleMember,
        entries,
        on_conflict: {:replace, [:role, :joined_at]},
        conflict_target: [:circle_id, :user_id]
      )

    count
  end

  defp upsert_alerts([], _now), do: 0

  defp upsert_alerts(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        latitude = required_float!(row, "latitude")
        longitude = required_float!(row, "longitude")

        %{
          id: required_string!(row, "id"),
          sender_id: required_string!(row, "sender_id"),
          latitude: latitude,
          longitude: longitude,
          geohash: required_string!(row, "geohash"),
          location: %Geo.Point{coordinates: {longitude, latitude}, srid: 4326},
          status: required_string!(row, "status"),
          expand_to_nearby: boolean_or_default(fetch(row, "expand_to_nearby"), false),
          created_at: datetime_or_now(fetch(row, "created_at"), now),
          resolved_at: datetime_or_nil(fetch(row, "resolved_at"))
        }
      end)

    {count, _} =
      Repo.insert_all(
        Alert,
        entries,
        on_conflict:
          {:replace,
           [
             :sender_id,
             :latitude,
             :longitude,
             :geohash,
             :location,
             :status,
             :expand_to_nearby,
             :created_at,
             :resolved_at
           ]},
        conflict_target: [:id]
      )

    count
  end

  defp upsert_alert_responses([], _now), do: 0

  defp upsert_alert_responses(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        %{
          alert_id: required_string!(row, "alert_id"),
          responder_id: required_string!(row, "responder_id"),
          status: required_string!(row, "status"),
          responded_at: datetime_or_now(fetch(row, "responded_at"), now)
        }
      end)

    {count, _} =
      Repo.insert_all(
        AlertResponse,
        entries,
        on_conflict: {:replace, [:status, :responded_at]},
        conflict_target: [:alert_id, :responder_id]
      )

    count
  end

  defp upsert_alert_messages([], _now), do: 0

  defp upsert_alert_messages(rows, now) do
    entries =
      Enum.map(rows, fn row ->
        %{
          id: required_string!(row, "id"),
          alert_id: required_string!(row, "alert_id"),
          sender_id: required_string!(row, "sender_id"),
          message: required_string!(row, "message"),
          created_at: datetime_or_now(fetch(row, "created_at"), now)
        }
      end)

    {count, _} =
      Repo.insert_all(
        AlertMessage,
        entries,
        on_conflict: {:replace, [:alert_id, :sender_id, :message, :created_at]},
        conflict_target: [:id]
      )

    count
  end

  defp find_dataset_file(nil, _candidates), do: nil

  defp find_dataset_file(dir, candidates) do
    (
      for candidate <- candidates,
          extension <- @extensions,
          do: Path.join(dir, "#{candidate}#{extension}")
    )
    |> Enum.find(&File.exists?/1)
  end

  defp put_count(counts, key, value), do: Map.put(counts, key, value)

  defp fetch(row, key) when is_map(row) do
    Map.get(row, key) || Map.get(row, String.to_atom(key))
  rescue
    ArgumentError -> Map.get(row, key)
  end

  defp required_string!(row, key) do
    case string_or_nil(fetch(row, key)) do
      nil -> raise ArgumentError, "missing required #{key} in #{inspect(row)}"
      value -> value
    end
  end

  defp required_float!(row, key) do
    case float_or_nil(fetch(row, key)) do
      nil -> raise ArgumentError, "missing required #{key} in #{inspect(row)}"
      value -> value
    end
  end

  defp string_or_nil(nil), do: nil
  defp string_or_nil(""), do: nil
  defp string_or_nil(value) when is_binary(value), do: String.trim(value) |> blank_to_nil()
  defp string_or_nil(value), do: to_string(value)

  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp float_or_nil(nil), do: nil
  defp float_or_nil(value) when is_float(value), do: value
  defp float_or_nil(value) when is_integer(value), do: value / 1

  defp float_or_nil(value) when is_binary(value) do
    case Float.parse(String.trim(value)) do
      {parsed, _rest} -> parsed
      :error -> nil
    end
  end

  defp boolean_or_default(nil, default), do: default
  defp boolean_or_default(value, _default) when value in [true, false], do: value
  defp boolean_or_default(value, default) when is_binary(value) do
    case String.downcase(String.trim(value)) do
      "true" -> true
      "t" -> true
      "1" -> true
      "false" -> false
      "f" -> false
      "0" -> false
      _ -> default
    end
  end

  defp datetime_or_now(nil, now), do: now
  defp datetime_or_now(value, _now), do: datetime_or_nil(value) || raise("invalid datetime #{inspect(value)}")

  defp datetime_or_nil(nil), do: nil
  defp datetime_or_nil(%DateTime{} = value), do: ensure_usec(value)

  defp datetime_or_nil(%NaiveDateTime{} = value) do
    value
    |> ensure_usec()
    |> DateTime.from_naive!("Etc/UTC")
  end

  defp datetime_or_nil(value) when is_binary(value) do
    trimmed = String.trim(value)

    cond do
      trimmed == "" ->
        nil

      match?({:ok, _datetime, _offset}, DateTime.from_iso8601(trimmed)) ->
        {:ok, datetime, _offset} = DateTime.from_iso8601(trimmed)
        ensure_usec(datetime)

      match?({:ok, _naive}, NaiveDateTime.from_iso8601(trimmed)) ->
        {:ok, naive} = NaiveDateTime.from_iso8601(trimmed)
        naive
        |> ensure_usec()
        |> DateTime.from_naive!("Etc/UTC")

      true ->
        nil
    end
  end

  defp ensure_usec(%DateTime{} = value) do
    %{value | microsecond: {elem(value.microsecond, 0), 6}}
  end

  defp ensure_usec(%NaiveDateTime{} = value) do
    %{value | microsecond: {elem(value.microsecond, 0), 6}}
  end
end
