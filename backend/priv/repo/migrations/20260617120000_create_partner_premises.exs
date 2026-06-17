defmodule BotonBackend.Repo.Migrations.CreatePartnerPremises do
  use Ecto.Migration

  # Maps an external partner's villa reference to the synthetic premises user and
  # responder circle provisioned for it. The unique villa_ref makes
  # POST /partner/provision idempotent (and race-safe under concurrent calls).
  def change do
    create table(:partner_premises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :villa_ref, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :circle_id, references(:circles, type: :binary_id, on_delete: :delete_all), null: false
      add :invite_code, :string, null: false
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:partner_premises, [:villa_ref])
  end
end
