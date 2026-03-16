## Deployment Notes

- Production backend server SSH: `ssh -i ~/.ssh/id_mbp_ed25519 debian@192.168.128.158`
- Production repo path on server: `~/apps/boton`
- Backend redeploy command on server:
  `cd ~/apps/boton && git pull --ff-only origin main && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build backend cloudflared`
