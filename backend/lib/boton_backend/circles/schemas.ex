defmodule BotonBackend.Circles.Circle do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "circles" do
    field :name, :string
    field :invite_code, :string

    belongs_to :creator, BotonBackend.Accounts.User, foreign_key: :created_by
    has_many :memberships, BotonBackend.Circles.CircleMember

    timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
  end

  def changeset(circle, attrs) do
    circle
    |> cast(attrs, [:name, :created_by, :invite_code])
    |> validate_required([:name, :created_by, :invite_code])
    |> validate_length(:name, min: 2, max: 80)
    |> unique_constraint(:invite_code)
  end
end

defmodule BotonBackend.Circles.CircleMember do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @foreign_key_type :binary_id

  schema "circle_members" do
    field :role, :string
    field :joined_at, :utc_datetime_usec

    belongs_to :circle, BotonBackend.Circles.Circle, primary_key: true
    belongs_to :user, BotonBackend.Accounts.User, primary_key: true
  end

  def changeset(circle_member, attrs) do
    circle_member
    |> cast(attrs, [:circle_id, :user_id, :role, :joined_at])
    |> validate_required([:circle_id, :user_id, :role])
  end
end
