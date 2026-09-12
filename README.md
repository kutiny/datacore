# DataCore

Lightweight self-hosted panel for managing databases and their users across multiple engines, driven entirely by environment variables. No container daemon access needed — the panel talks to each engine directly over TCP.

Supported engines: **PostgreSQL**, **MySQL**, **MariaDB**, **MongoDB**.

## Features

- Deploy a database on any enabled engine and get working credentials back
- Add / remove per-database users from the UI
- Live engine status cards (running / error)
- Per-database detail page with connection string and user list
- All settings (admin accounts, hosts, ports, panel password) come from env vars

## Quick start (local)

```bash
pnpm install
cp .env.example .env   # set DATACORE_PASSWORD, *_HOST, *_SUPER* credentials
pnpm start             # http://localhost:3737
```

Log in with `DATACORE_PASSWORD`. An engine only appears in the UI when its `*_HOST` is set in `.env`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATACORE_PASSWORD` | Panel login password |
| `SESSION_SECRET` | Session signing secret (random if empty) |
| `DATACORE_HOST` | Hostname shown in the UI connection strings |
| `DATACORE_PORT` / `PORT` | Panel port (default `3737`) |
| `*_HOST` | Enables the engine and is what the panel actually connects to (`POSTGRES_HOST`, `MYSQL_HOST`, `MARIADB_HOST`, `MONGO_HOST`) |
| `*_CONN_PORT` | Internal port the panel uses to reach the engine (overrides the image default) |
| `*_PORT` | Published host port, shown in the UI connection details |
| `*_SUPERUSER` | Admin user used by the panel per engine (`POSTGRES_SUPERUSER`, `MYSQL_SUPERUSER`, `MARIADB_SUPERUSER`, `MONGO_SUPERUSER`) |
| `*_SUPERPASSWORD` | Admin password per engine (`POSTGRES_SUPERPASSWORD`, `MYSQL_SUPERPASSWORD`, `MARIADB_SUPERPASSWORD`, `MONGO_SUPERPASSWORD`) |

Notes:

- `MYSQL_ROOT_PASSWORD` / `MARIADB_ROOT_PASSWORD` are still honored as fallbacks when the matching `*_SUPERPASSWORD` is unset.
- Leave `MONGO_SUPERUSER` / `MONGO_SUPERPASSWORD` empty when MongoDB runs without authentication.
- `DATACORE_HOST` is only used for the connection string **displayed** in the UI. Live connections always use the per-engine `*_HOST`.

## Usage

1. **Dashboard** — engine status cards plus a table of deployed databases.
2. **Deploy database** — pick an engine, name, and optional admin user/password; the panel provisions the database, creates the user, and returns the credentials once.
3. **Manage** — open a database's detail page to see its connection string and add/remove users. Passwords are shown masked with a reveal toggle.
4. **Log out** — top-right of the topbar.

## Docker Compose

Single project that runs the panel and all engines:

```bash
docker compose up -d
```

The panel container reaches engines by their compose service names (`postgres`, `mysql`, `mariadb`, `mongo`). Admin credentials are passed through `*_SUPERUSER` / `*_SUPERPASSWORD`, and the MySQL/MariaDB containers stay in sync with the panel's `*_SUPERPASSWORD`.

## Development

```bash
pnpm dev          # watch mode
pnpm lint         # eslint .
pnpm format       # prettier --write .
```

Pre-commit hook (husky + lint-staged) formats and lint-fixes staged files automatically.