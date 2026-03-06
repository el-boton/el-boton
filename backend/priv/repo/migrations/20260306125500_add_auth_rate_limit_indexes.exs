defmodule BotonBackend.Repo.Migrations.AddAuthRateLimitIndexes do
  use Ecto.Migration

  def change do
    create_if_not_exists index(:audit_logs, [:action, :ip_address, :recorded_at],
                           name: :audit_logs_action_ip_recorded_at_index
                         )

    create_if_not_exists index(:audit_logs, [:action, :phone, :recorded_at],
                           name: :audit_logs_action_phone_recorded_at_index
                         )

    create_if_not_exists index(:phone_otp_challenges, [:phone, :inserted_at],
                           where: "consumed_at IS NULL",
                           name: :phone_otp_challenges_active_phone_inserted_at_index
                         )
  end
end
