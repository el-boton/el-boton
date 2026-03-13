defmodule BotonBackend.Repo.Migrations.CreateAlertRecipients do
  use Ecto.Migration

  def change do
    create table(:alert_recipients, primary_key: false) do
      add :alert_id, references(:alerts, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :reason, :string, null: false
      add :granted_at, :utc_datetime_usec, default: fragment("NOW()"), null: false
    end

    create index(:alert_recipients, [:user_id])

    execute(
      "ALTER TABLE alert_recipients ADD CONSTRAINT alert_recipients_reason_check CHECK (reason IN ('circle', 'nearby'))"
    )

    execute("""
    INSERT INTO alert_recipients (alert_id, user_id, reason, granted_at)
    SELECT alerts.id, member.user_id, 'circle', alerts.created_at
    FROM alerts
    JOIN circle_members sender_member
      ON sender_member.user_id = alerts.sender_id
    JOIN circle_members member
      ON member.circle_id = sender_member.circle_id
    WHERE member.user_id != alerts.sender_id
    ON CONFLICT (alert_id, user_id) DO NOTHING
    """)
  end
end
