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

  require Logger

  def deliver_otp(phone, code) do
    config =
      Application.fetch_env!(:boton_backend, BotonBackend.Notifications.SMS)

    account_sid = Keyword.fetch!(config, :account_sid)
    auth_token = Keyword.fetch!(config, :auth_token)
    from_number = Keyword.fetch!(config, :from_number)

    response =
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

    if response.status in 200..299 do
      Logger.info("Twilio SMS sent: to=#{phone} sid=#{response.body["sid"]} status=#{response.body["status"]}")
      :ok
    else
      Logger.error("Twilio SMS failed: status=#{response.status} body=#{inspect(response.body)}")
      {:error, :twilio_delivery_failed}
    end
  rescue
    error ->
      Logger.error("Twilio SMS exception: #{inspect(error)}")
      {:error, :twilio_delivery_failed}
  end
end
