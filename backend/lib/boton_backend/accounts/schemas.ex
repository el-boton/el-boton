defmodule BotonBackend.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :phone, :string

    has_one :profile, BotonBackend.Accounts.Profile,
      foreign_key: :id,
      references: :id

    has_many :refresh_tokens, BotonBackend.Accounts.RefreshToken

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:phone])
    |> validate_required([:phone])
    |> unique_constraint(:phone)
  end
end

defmodule BotonBackend.Accounts.Profile do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "profiles" do
    field :display_name, :string
    field :phone, :string
    field :push_token, :string
    field :location_geohash, :string
    field :location, Geo.PostGIS.Geometry
    field :location_updated_at, :utc_datetime_usec

    belongs_to :user, BotonBackend.Accounts.User,
      define_field: false,
      foreign_key: :id,
      references: :id,
      type: :binary_id

    timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
  end

  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [:display_name, :phone, :push_token, :location_geohash, :location, :location_updated_at])
    |> validate_length(:display_name, min: 2, max: 50)
  end
end

defmodule BotonBackend.Accounts.PhoneOtpChallenge do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "phone_otp_challenges" do
    field :phone, :string
    field :code_hash, :string
    field :code_salt, :string
    field :expires_at, :utc_datetime_usec
    field :consumed_at, :utc_datetime_usec
    field :attempt_count, :integer, default: 0
    field :ip_address, :string
    field :user_agent, :string

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(challenge, attrs) do
    challenge
    |> cast(attrs, [:phone, :code_hash, :code_salt, :expires_at, :consumed_at, :attempt_count, :ip_address, :user_agent])
    |> validate_required([:phone, :code_hash, :code_salt, :expires_at])
  end
end

defmodule BotonBackend.Accounts.RefreshToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "refresh_tokens" do
    field :token_hash, :string
    field :token_prefix, :string
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :last_used_at, :utc_datetime_usec
    field :ip_address, :string
    field :user_agent, :string

    belongs_to :user, BotonBackend.Accounts.User

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(refresh_token, attrs) do
    refresh_token
    |> cast(attrs, [:user_id, :token_hash, :token_prefix, :expires_at, :revoked_at, :last_used_at, :ip_address, :user_agent])
    |> validate_required([:user_id, :token_hash, :token_prefix, :expires_at])
    |> unique_constraint(:token_hash)
  end
end

defmodule BotonBackend.Accounts.AuditLog do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "audit_logs" do
    field :action, :string
    field :phone, :string
    field :ip_address, :string
    field :metadata, :map, default: %{}

    belongs_to :user, BotonBackend.Accounts.User

    timestamps(type: :utc_datetime_usec, inserted_at: :recorded_at, updated_at: false)
  end

  def changeset(audit_log, attrs) do
    audit_log
    |> cast(attrs, [:action, :user_id, :phone, :ip_address, :metadata, :recorded_at])
    |> validate_required([:action])
  end
end
