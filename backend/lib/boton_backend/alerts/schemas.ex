defmodule BotonBackend.Alerts.Alert do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "alerts" do
    field :latitude, :float
    field :longitude, :float
    field :geohash, :string
    field :location, Geo.PostGIS.Geometry
    field :status, :string
    field :expand_to_nearby, :boolean, default: false
    field :resolved_at, :utc_datetime_usec

    belongs_to :sender, BotonBackend.Accounts.User, foreign_key: :sender_id
    has_many :responses, BotonBackend.Alerts.AlertResponse
    has_many :messages, BotonBackend.Alerts.AlertMessage

    timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
  end

  def changeset(alert, attrs) do
    alert
    |> cast(attrs, [
      :sender_id,
      :latitude,
      :longitude,
      :geohash,
      :location,
      :status,
      :expand_to_nearby,
      :resolved_at
    ])
    |> validate_required([:sender_id, :latitude, :longitude, :geohash, :location, :status])
  end
end

defmodule BotonBackend.Alerts.AlertResponse do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @foreign_key_type :binary_id

  schema "alert_responses" do
    field :status, :string
    field :responded_at, :utc_datetime_usec

    belongs_to :alert, BotonBackend.Alerts.Alert, primary_key: true

    belongs_to :responder, BotonBackend.Accounts.User,
      foreign_key: :responder_id,
      primary_key: true
  end

  def changeset(response, attrs) do
    response
    |> cast(attrs, [:alert_id, :responder_id, :status, :responded_at])
    |> validate_required([:alert_id, :responder_id, :status])
  end
end

defmodule BotonBackend.Alerts.AlertRecipient do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @foreign_key_type :binary_id

  schema "alert_recipients" do
    field :reason, :string
    field :granted_at, :utc_datetime_usec

    belongs_to :alert, BotonBackend.Alerts.Alert, primary_key: true
    belongs_to :user, BotonBackend.Accounts.User, primary_key: true
  end

  def changeset(recipient, attrs) do
    recipient
    |> cast(attrs, [:alert_id, :user_id, :reason, :granted_at])
    |> validate_required([:alert_id, :user_id, :reason])
  end
end

defmodule BotonBackend.Alerts.AlertMessage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "alert_messages" do
    field :message, :string

    belongs_to :alert, BotonBackend.Alerts.Alert
    belongs_to :sender, BotonBackend.Accounts.User, foreign_key: :sender_id

    timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
  end

  def changeset(alert_message, attrs) do
    alert_message
    |> cast(attrs, [:alert_id, :sender_id, :message])
    |> validate_required([:alert_id, :sender_id, :message])
    |> validate_length(:message, min: 1, max: 1_000)
  end
end

defmodule BotonBackend.Alerts.PushDeliveryAttempt do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "push_delivery_attempts" do
    field :push_token, :string
    field :status, :string
    field :response_body, :map
    field :error_message, :string

    belongs_to :alert, BotonBackend.Alerts.Alert
    belongs_to :user, BotonBackend.Accounts.User

    timestamps(type: :utc_datetime_usec, inserted_at: :attempted_at, updated_at: false)
  end

  def changeset(attempt, attrs) do
    attempt
    |> cast(attrs, [:alert_id, :user_id, :push_token, :status, :response_body, :error_message])
    |> validate_required([:alert_id, :user_id, :push_token, :status])
  end
end
