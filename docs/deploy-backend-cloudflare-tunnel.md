# Production Backend Deployment With Cloudflare Tunnel

This repo now includes a production compose stack for:

- `postgres`
- the Phoenix backend release
- `cloudflared`

The production frontend config already points to `https://api.elbotonapp.com`, so the main work is standing up the backend stack and attaching a Cloudflare Tunnel to that hostname.

## 1. Prepare the server

Install Docker Engine and the Docker Compose plugin on the production host.

Clone this repo on the server, then create the production env file:

```bash
cp .env.prod.example .env.prod
```

Generate URL-safe secrets and paste them into `.env.prod`:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 64   # SECRET_KEY_BASE
openssl rand -hex 64   # JWT_SIGNING_SECRET
openssl rand -hex 64   # TOKEN_HASH_SECRET
```

Set:

- `PHX_HOST=api.elbotonapp.com`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`
- `SMS_PROVIDER=twilio` only if you are ready to add the Twilio credentials

## 2. Create the Cloudflare Tunnel

Install `cloudflared` somewhere you can log into the Cloudflare account for `elbotonapp.com`.

Authenticate:

```bash
cloudflared tunnel login
```

Create a tunnel:

```bash
cloudflared tunnel create boton-backend-prod
```

Route the hostname to that tunnel:

```bash
cloudflared tunnel route dns boton-backend-prod api.elbotonapp.com
```

Cloudflare will create a tunnel credentials file named like `<TUNNEL_UUID>.json`.

Copy that file to the server under `deploy/cloudflared/`, then create the runtime config:

```bash
cp deploy/cloudflared/config.yml.example deploy/cloudflared/config.yml
```

Edit `deploy/cloudflared/config.yml` and replace both `REPLACE_WITH_YOUR_TUNNEL_UUID` values with the real tunnel UUID from the JSON filename.

## 3. Start the production stack

From the repo root on the server:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The backend container runs database migrations on startup by default, then starts the Phoenix release.

## 4. Verify the deployment

Check container status:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Tail logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend cloudflared
```

Verify the public hostname:

```bash
curl -I https://api.elbotonapp.com/robots.txt
```

If the tunnel is healthy, you should get an HTTP response from Phoenix through Cloudflare.

## 5. Operational notes

- No public `4000` or `5432` port needs to be exposed on the server.
- Keep `deploy/cloudflared/config.yml`, the tunnel JSON credential file, and `.env.prod` out of git.
- If you need to restart without migrations for a one-off debug cycle, set `SKIP_MIGRATIONS=true` in `.env.prod`.
- The production mobile build already uses `https://api.elbotonapp.com` in `frontend/eas.json`.

## References

- Cloudflare Tunnel create and route DNS hostname:
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/
- Cloudflared configuration file and ingress rules:
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/configuration-file/
- Cloudflared install guide:
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- Phoenix releases:
  https://hexdocs.pm/phoenix/Mix.Tasks.Phx.Gen.Release.html
