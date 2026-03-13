defmodule BotonBackend.Notifications.ConsoleSMSProvider do
  @moduledoc false

  require Logger

  def deliver_otp(phone, code, channel \\ "sms") do
    Logger.warning("DEV OTP for #{phone} via #{channel}: #{code}")
    :ok
  end
end

defmodule BotonBackend.Notifications.TwilioSMSProvider do
  @moduledoc false

  require Logger

  def deliver_otp(phone, code, channel \\ "sms") do
    config =
      Application.fetch_env!(:boton_backend, BotonBackend.Notifications.SMS)

    account_sid = Keyword.fetch!(config, :account_sid)
    auth_token = Keyword.fetch!(config, :auth_token)
    messaging_service_sid = Keyword.fetch!(config, :messaging_service_sid)

    to = if channel == "whatsapp", do: "whatsapp:#{phone}", else: phone

    form_params =
      case channel do
        "whatsapp" ->
          [
            To: to,
            MessagingServiceSid: messaging_service_sid,
            ContentSid: Keyword.fetch!(config, :whatsapp_content_sid),
            ContentVariables: Jason.encode!(%{"1" => code})
          ]

        _ ->
          [
            To: to,
            MessagingServiceSid: messaging_service_sid,
            Body: "#{code} is your verification code. For your security, do not share this code."
          ]
      end

    response =
      Req.post!(
        "https://api.twilio.com/2010-04-01/Accounts/#{account_sid}/Messages.json",
        headers: [
          authorization: "Basic #{Base.encode64("#{account_sid}:#{auth_token}")}"
        ],
        form: form_params
      )

    if response.status in 200..299 do
      Logger.info("Twilio #{channel} sent: to=#{phone} sid=#{response.body["sid"]} status=#{response.body["status"]}")
      :ok
    else
      Logger.error("Twilio #{channel} failed: status=#{response.status} body=#{inspect(response.body)}")
      {:error, :twilio_delivery_failed}
    end
  rescue
    error ->
      Logger.error("Twilio #{channel} exception: #{inspect(error)}")
      {:error, :twilio_delivery_failed}
  end
end
