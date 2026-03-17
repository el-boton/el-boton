defmodule BotonBackendWeb.InviteControllerTest do
  use BotonBackendWeb.ConnCase, async: true

  test "valid invite page uses a path-based deep link and includes store links", %{conn: conn} do
    conn = get(conn, ~p"/join/ABC123")

    html = response(conn, 200)

    assert html =~ "elboton:///join/ABC123"
    assert html =~ "https://apps.apple.com/us/app/el-boton/id6757484682"

    assert html =~
             "https://zapstore.dev/apps/naddr1qq8kxmmd9ejkccn0w3hkutnpwpcqzxrhwden5te0wfjkccte9eaxzurnw3hhyefwv3jhvq3qtaycl7qfuqk9dp0rhkse8lxhz3az9eanjug8j4ympwehvslnetxqxpqqqplqk89g2dc"
  end

  test "invalid invite codes are rejected", %{conn: conn} do
    conn = get(conn, ~p"/join/<script>")

    assert response(conn, 400) == "Invalid invite code"
  end
end
