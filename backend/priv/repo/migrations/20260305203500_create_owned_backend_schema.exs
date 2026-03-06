defmodule BotonBackend.Repo.Migrations.CreateOwnedBackendSchema do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    execute("CREATE EXTENSION IF NOT EXISTS postgis")

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :phone, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:phone])

    create table(:phone_otp_challenges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :phone, :string, null: false
      add :code_hash, :string, null: false
      add :code_salt, :string, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :consumed_at, :utc_datetime_usec
      add :attempt_count, :integer, default: 0, null: false
      add :ip_address, :string
      add :user_agent, :string

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:phone_otp_challenges, [:phone, :inserted_at])

    create table(:refresh_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :token_hash, :string, null: false
      add :token_prefix, :string, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :revoked_at, :utc_datetime_usec
      add :last_used_at, :utc_datetime_usec
      add :ip_address, :string
      add :user_agent, :string

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:refresh_tokens, [:token_hash])
    create index(:refresh_tokens, [:user_id])
    create index(:refresh_tokens, [:expires_at])

    create table(:profiles, primary_key: false) do
      add :id, references(:users, type: :binary_id, on_delete: :delete_all), primary_key: true
      add :display_name, :string
      add :phone, :string
      add :push_token, :string
      add :location_geohash, :string
      add :location, :"geography(Point,4326)"
      add :location_updated_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
    end

    create index(:profiles, [:location_geohash])
    execute("CREATE INDEX profiles_location_idx ON profiles USING GIST (location)")

    create table(:circles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :created_by, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :invite_code, :string, null: false

      timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
    end

    create unique_index(:circles, [:invite_code])
    create index(:circles, [:created_by])

    create table(:circle_members, primary_key: false) do
      add :circle_id, references(:circles, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :role, :string, default: "member", null: false
      add :joined_at, :utc_datetime_usec, default: fragment("NOW()"), null: false
    end

    create index(:circle_members, [:user_id])
    execute(
      "ALTER TABLE circle_members ADD CONSTRAINT circle_members_role_check CHECK (role IN ('owner', 'member'))"
    )

    create table(:alerts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :sender_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :latitude, :float, null: false
      add :longitude, :float, null: false
      add :geohash, :string, null: false
      add :location, :"geography(Point,4326)", null: false
      add :status, :string, default: "active", null: false
      add :expand_to_nearby, :boolean, default: false, null: false
      add :resolved_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
    end

    create index(:alerts, [:sender_id])
    create index(:alerts, [:status])
    create index(:alerts, [:geohash])
    execute("CREATE INDEX alerts_location_idx ON alerts USING GIST (location)")
    execute(
      "ALTER TABLE alerts ADD CONSTRAINT alerts_status_check CHECK (status IN ('active', 'resolved', 'cancelled'))"
    )

    create table(:alert_responses, primary_key: false) do
      add :alert_id, references(:alerts, type: :binary_id, on_delete: :delete_all), primary_key: true

      add :responder_id, references(:users, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :status, :string, null: false
      add :responded_at, :utc_datetime_usec, default: fragment("NOW()"), null: false
    end

    create index(:alert_responses, [:responder_id])
    execute(
      "ALTER TABLE alert_responses ADD CONSTRAINT alert_responses_status_check CHECK (status IN ('acknowledged', 'en_route', 'arrived'))"
    )

    create table(:alert_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :alert_id, references(:alerts, type: :binary_id, on_delete: :delete_all), null: false
      add :sender_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :message, :text, null: false

      timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
    end

    create index(:alert_messages, [:alert_id, :created_at])

    create table(:push_delivery_attempts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :alert_id, references(:alerts, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :push_token, :string, null: false
      add :status, :string, null: false
      add :response_body, :map
      add :error_message, :text

      timestamps(type: :utc_datetime_usec, inserted_at: :attempted_at, updated_at: false)
    end

    create index(:push_delivery_attempts, [:alert_id])
    create index(:push_delivery_attempts, [:user_id])

    create table(:audit_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :action, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :phone, :string
      add :ip_address, :string
      add :metadata, :map, default: %{}, null: false

      timestamps(type: :utc_datetime_usec, inserted_at: :recorded_at, updated_at: false)
    end

    create index(:audit_logs, [:action, :recorded_at])
    create index(:audit_logs, [:user_id, :recorded_at])
    create index(:audit_logs, [:phone, :recorded_at])
  end
end
