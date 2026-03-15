defmodule BotonBackendWeb.InviteController do
  use BotonBackendWeb, :controller

  # Only allow alphanumeric invite codes (base64url uppercase)
  @valid_code_regex ~r/^[A-Z0-9]{1,12}$/

  def show(conn, %{"code" => code}) do
    code = String.upcase(String.trim(code))

    if not Regex.match?(@valid_code_regex, code) do
      conn
      |> put_resp_content_type("text/html")
      |> send_resp(400, "Invalid invite code")
    else
      safe_code = html_escape(code)
      deep_link = "elboton://join/#{code}"
      safe_deep_link = html_escape(deep_link)

      html = """
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Join Circle - El Boton</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { text-align: center; padding: 40px 24px; max-width: 360px; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #E63333; margin: 24px 0; }
          p { color: #999; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
          .btn { display: inline-block; background: #E63333; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; }
          .store-links { margin-top: 32px; }
          .store-links a { color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>El Boton</h1>
          <p>You've been invited to join a safety circle</p>
          <div class="code">#{safe_code}</div>
          <a class="btn" id="open" href="#{safe_deep_link}">Open in App</a>
          <div class="store-links">
            <p>Don't have the app?</p>
            <a href="https://apps.apple.com/app/el-boton/id6745136798">App Store</a>
          </div>
        </div>
        <script>
          // Auto-redirect to app on load
          setTimeout(function() { window.location.href = "#{safe_deep_link}"; }, 100);
        </script>
      </body>
      </html>
      """

      conn
      |> put_resp_content_type("text/html")
      |> send_resp(200, html)
    end
  end

  defp html_escape(string) do
    string
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
    |> String.replace("'", "&#39;")
  end
end
