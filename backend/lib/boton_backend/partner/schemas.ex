defmodule BotonBackend.Partner.Premise do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "partner_premises" do
    field :villa_ref, :string
    field :user_id, :binary_id
    field :circle_id, :binary_id
    field :invite_code, :string
    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(premise, attrs) do
    premise
    |> cast(attrs, [:villa_ref, :user_id, :circle_id, :invite_code])
    |> validate_required([:villa_ref, :user_id, :circle_id, :invite_code])
    |> unique_constraint(:villa_ref)
  end
end
