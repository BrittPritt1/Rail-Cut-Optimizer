# Deploying outside Replit

The app is a single Docker image: the Express API server also serves the
built frontend in production (see `artifacts/api-server/src/app.ts`), so
there's one process and one Postgres database to run.

## Option A — Docker Compose on your own server/VPS (recommended)

Requires Docker + the Docker Compose plugin on the host.

1. Copy `.env.example` to `.env` and fill in real values:
   - `POSTGRES_PASSWORD` — any strong password.
   - `SESSION_SECRET` — random string, e.g. `openssl rand -hex 32`.
   - `ADMIN_PIN` — the PIN you'll use to unlock admin mode in the app.
2. Build and start everything:
   ```
   docker compose up -d --build
   ```
3. Push the database schema (one-time, and again after any schema change):
   ```
   docker compose run --rm migrate
   ```
4. Open `http://<server>:8080` (or whatever `APP_PORT` you set).

To update after pulling new code: `docker compose up -d --build`.

### Putting it behind a domain + HTTPS

The admin-login cookie is marked `secure`, so admin login only works over
HTTPS. Put a reverse proxy in front of the `app` container that terminates
TLS and forwards to port 8080 — e.g. [Caddy](https://caddyserver.com/) with:

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

Caddy issues and renews the certificate automatically. Nginx + certbot works
the same way if you already run Nginx.

## Option B — A container platform (Railway, Render, Fly.io, etc.)

These platforms build directly from the `Dockerfile` at the repo root and
give you HTTPS on their domain automatically, so you don't need Option A's
reverse-proxy step.

1. Create a managed Postgres database on the platform (or point
   `DATABASE_URL` at any reachable Postgres instance).
2. Create a new service from this repo; it will detect and build the
   `Dockerfile`.
3. Set environment variables on the service: `DATABASE_URL`, `SESSION_SECRET`,
   `ADMIN_PIN`, `NODE_ENV=production`, `PORT=8080` (match whatever port the
   platform expects the container to listen on).
4. After the first deploy, run the schema push once against the same
   `DATABASE_URL`, e.g. from your own machine:
   ```
   DATABASE_URL=<the platform's connection string> pnpm --filter @workspace/db run push
   ```
   (requires Node + pnpm locally, and the workspace installed with
   `pnpm install`).

## Environment variables

| Variable         | Required | Notes                                                        |
| ---------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Postgres connection string                                    |
| `SESSION_SECRET` | yes      | Signs the admin session cookie; any long random string        |
| `ADMIN_PIN`      | yes      | PIN that unlocks admin mode in the app                        |
| `PORT`           | yes      | Port the Node process listens on (`8080` in the provided setup) |
| `NODE_ENV`       | yes      | Must be `production` for a deployment (enables serving the built frontend and secure cookies) |

## Keeping it running

- `docker-compose.yml` sets `restart: unless-stopped` on both `app` and `db`,
  so they come back up after a reboot or crash as long as Docker itself is
  set to start on boot (`sudo systemctl enable docker` on most Linux distros).
- Back up the `db-data` Docker volume regularly (`docker compose exec db
  pg_dump ...`) — it's the only place your saved dimensions live.
