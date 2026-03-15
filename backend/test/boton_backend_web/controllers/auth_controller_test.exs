defmodule BotonBackendWeb.AuthControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  import Ecto.Query
  import ExUnit.CaptureLog

  alias BotonBackend.Accounts
  alias BotonBackend.Accounts.{PhoneOtpChallenge, RefreshToken}
  alias BotonBackend.Fixtures

  test "request otp creates a challenge and returns success", %{conn: conn} do
    phone = unique_phone()

    {conn, log} =
      with_log(fn ->
        post(conn, ~p"/auth/otp/request", %{phone: phone})
      end)

    assert %{"ok" => true} = json_response(conn, 200)
    assert Fixtures.extract_otp_code!(log, phone) =~ ~r/^\d{6}$/

    challenge_count =
      PhoneOtpChallenge
      |> where([challenge], challenge.phone == ^phone)
      |> Repo.aggregate(:count, :id)

    assert challenge_count == 1
  end

  test "request otp is rate limited to one request per phone per minute", %{conn: conn} do
    phone = unique_phone()

    {first_conn, _log} =
      with_log(fn ->
        post(conn, ~p"/auth/otp/request", %{phone: phone})
      end)

    assert %{"ok" => true} = json_response(first_conn, 200)

    second_conn = post(build_conn(), ~p"/auth/otp/request", %{phone: phone})

    assert %{
             "error" => %{
               "code" => "otp_rate_limited",
               "message" => "Please wait before requesting another code"
             }
           } = json_response(second_conn, 422)

    challenge_count =
      PhoneOtpChallenge
      |> where([challenge], challenge.phone == ^phone)
      |> Repo.aggregate(:count, :id)

    assert challenge_count == 1
  end

  test "verify otp creates the user profile and session", %{conn: conn} do
    phone = unique_phone()
    code = request_otp_code_from_api(conn, phone)

    conn = post(build_conn(), ~p"/auth/otp/verify", %{phone: phone, code: code})

    assert %{
             "access_token" => access_token,
             "refresh_token" => refresh_token,
             "expires_in" => expires_in,
             "user" => %{"id" => user_id, "phone" => ^phone}
           } = json_response(conn, 200)

    assert is_binary(access_token)
    assert is_binary(refresh_token)
    assert expires_in > 0
    assert Accounts.get_user(user_id)
    assert Accounts.get_profile(user_id)
  end

  test "refresh rotates the refresh token and logout revokes it", %{conn: conn} do
    phone = unique_phone()
    code = request_otp_code_from_api(conn, phone)

    verify_conn = post(build_conn(), ~p"/auth/otp/verify", %{phone: phone, code: code})

    %{
      "refresh_token" => refresh_token,
      "user" => %{"id" => user_id}
    } = json_response(verify_conn, 200)

    refresh_conn =
      post(build_conn(), ~p"/auth/refresh", %{refresh_token: refresh_token})

    %{"refresh_token" => rotated_refresh_token} = json_response(refresh_conn, 200)

    assert rotated_refresh_token != refresh_token

    active_tokens =
      RefreshToken
      |> where([token], token.user_id == ^user_id and is_nil(token.revoked_at))
      |> Repo.aggregate(:count, :id)

    assert active_tokens == 1

    logout_conn =
      post(build_conn(), ~p"/auth/logout", %{refresh_token: rotated_refresh_token})

    assert response(logout_conn, 204)

    active_tokens_after_logout =
      RefreshToken
      |> where([token], token.user_id == ^user_id and is_nil(token.revoked_at))
      |> Repo.aggregate(:count, :id)

    assert active_tokens_after_logout == 0
  end

  defp request_otp_code_from_api(conn, phone) do
    {otp_conn, log} =
      with_log(fn ->
        post(conn, ~p"/auth/otp/request", %{phone: phone})
      end)

    assert %{"ok" => true} = json_response(otp_conn, 200)
    Fixtures.extract_otp_code!(log, phone)
  end
end
