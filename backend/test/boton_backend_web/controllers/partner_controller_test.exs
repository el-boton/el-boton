defmodule BotonBackendWeb.PartnerControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  alias BotonBackend.Accounts
  alias BotonBackend.Accounts.User
  alias BotonBackend.Repo

  @secret "test-partner-provision-secret"

  defp partner_conn(conn), do: put_req_header(conn, "x-partner-secret", @secret)

  test "provisions a premises user, circle, and tokens", %{conn: conn} do
    conn =
      conn
      |> partner_conn()
      |> post(~p"/partner/provision", %{villa_ref: "villa-abc", villa_name: "Villa Marbella"})

    body = json_response(conn, 200)
    assert is_binary(body["user_id"])
    assert is_binary(body["circle_id"])
    assert is_binary(body["refresh_token"])
    assert body["invite_link"] =~ "/join/"

    # The synthetic user exists and is keyed by a non-OTP sentinel phone.
    user = Repo.get(User, body["user_id"])
    assert user.phone == "partner:villa-abc"
  end

  test "is idempotent on villa_ref (same user + circle, rotated token)", %{conn: conn} do
    params = %{villa_ref: "villa-abc", villa_name: "Villa Marbella"}

    r1 = conn |> partner_conn() |> post(~p"/partner/provision", params) |> json_response(200)
    r2 = build_conn() |> partner_conn() |> post(~p"/partner/provision", params) |> json_response(200)

    assert r1["user_id"] == r2["user_id"]
    assert r1["circle_id"] == r2["circle_id"]
    assert r1["refresh_token"] != r2["refresh_token"]
  end

  test "the provisioned account cannot start the OTP flow (non-E.164 sentinel)", %{conn: conn} do
    conn
    |> partner_conn()
    |> post(~p"/partner/provision", %{villa_ref: "villa-otp", villa_name: "Villa OTP"})
    |> json_response(200)

    assert {:error, _, _} = Accounts.request_otp("partner:villa-otp", %{ip_address: "127.0.0.1"})
  end

  test "rejects a request with the wrong secret", %{conn: conn} do
    conn =
      conn
      |> put_req_header("x-partner-secret", "nope")
      |> post(~p"/partner/provision", %{villa_ref: "x", villa_name: "y"})

    assert %{"error" => %{"code" => "unauthorized"}} = json_response(conn, 401)
  end

  test "rejects a request with no secret", %{conn: conn} do
    conn = post(conn, ~p"/partner/provision", %{villa_ref: "x", villa_name: "y"})
    assert %{"error" => %{"code" => "unauthorized"}} = json_response(conn, 401)
  end

  test "422s when required params are missing", %{conn: conn} do
    conn = conn |> partner_conn() |> post(~p"/partner/provision", %{villa_ref: "x"})
    assert json_response(conn, 400)["error"]["code"] == "invalid_params"
  end
end
