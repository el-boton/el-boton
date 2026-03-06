defmodule BotonBackend.Notifications.ConsoleSMSProvider do
  @moduledoc false

  require Logger

  def deliver_otp(phone, code) do
    Logger.warning("DEV OTP for #{phone}: #{code}")
    :ok
  end
end

defmodule BotonBackend.Notifications.TwilioSMSProvider do
  @moduledoc false

  def deliver_otp(phone, code) do
    config =
      Application.fetch_env!(:boton_backend, BotonBackend.Notifications.SMS)

    account_sid = Keyword.fetch!(config, :account_sid)
    auth_token = Keyword.fetch!(config, :auth_token)
    from_number = Keyword.fetch!(config, :from_number)

    Req.post!(
      "https://api.twilio.com/2010-04-01/Accounts/#{account_sid}/Messages.json",
      headers: [
        authorization: "Basic #{Base.encode64("#{account_sid}:#{auth_token}")}"
      ],
      form: [
        To: phone,
        From: from_number,
        Body: "Your El Boton verification code is #{code}"
      ]
    )

    :ok
  rescue
    _error -> {:error, :twilio_delivery_failed}
  end
end
