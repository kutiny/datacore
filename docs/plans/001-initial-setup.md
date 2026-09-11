# DataCore - Initial Setup Plan

> Status: implemented. Base scaffold complete (auth, store, docker+engine
> services, API, UI, compose). Engine container provisioning (pg/mysql/mongo)
> still needs a live Docker socket to verify E2E.

## Goal
Build a lightweight database management panel that deploys databases
using one container per engine type.

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Plain HTML + vanilla JS (server-rendered)
- **Package Manager:** pnpm
- **Deployment:** Docker Compose
- **Auth:** Simple password (bcrypt + sessions)

## Supported Engines
| Engine     | Container  | Port    |
|------------|------------|---------|
| PostgreSQL | 1          | 5432    |
| MySQL      | 1          | 3306    |
| MongoDB    | 1          | 27017   |
| SQLite     | No container | N/A  |

## Project Structure
```
datacore/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
│
├── src/
│   ├── index.js                # Express entry point
│   ├── config.js               # Config (ports, auth, etc.)
│   ├── auth.js                 # Simple password middleware
│   ├── routes/
│   │   ├── auth.js             # POST /login, POST /logout
│   │   ├── databases.js        # CRUD + credentials
│   │   └── engines.js          # Engine status endpoints
│   ├── services/
│   │   ├── docker.js           # Docker socket client
│   │   ├── postgres.js         # PG engine operations
│   │   ├── mysql.js            # MySQL engine operations
│   │   ├── mongo.js            # MongoDB engine operations
│   │   └── sqlite.js           # SQLite file operations
│   ├── store/
│   │   └── db.js               # Metadata store (better-sqlite3 at data/datacore.db)
│   └── views/
│       ├── login.html
│       ├── dashboard.html
│       ├── render.js           # tiny {{var}} template renderer
│       └── partials/
│           └── create-form.html
│
├── public/
│   ├── style.css
│   └── app.js
│
└── data/
    ├── datacore.db             # metadata registry (auto-created)
    └── sqlite/                 # SQLite database files
```

## API Endpoints
| Method | Endpoint                 | Description           |
|--------|--------------------------|-----------------------|
| POST   | /login                   | Authenticate          |
| POST   | /logout                  | End session           |
| GET    | /                        | Dashboard             |
| GET    | /api/databases           | List all databases    |
| POST   | /api/databases           | Create new database   |
| DELETE | /api/databases/:id       | Delete a database     |
| POST   | /api/databases/:id/users | Create credentials    |
| DELETE | /api/databases/:id/users/:uid | Revoke credentials |
| GET    | /api/engines             | Engine status         |
| GET    | /api/databases/:id      | Get single database   |

## Refinements (vs original plan)
- Metadata store uses **better-sqlite3** (`data/datacore.db`) instead of JSON
  for safe concurrent writes; SQLite engine databases live in `data/sqlite/`.
- Engine containers use named volumes (`datacore-<engine>-data`) with
  `unless-stopped` restart policy; ports and images are configurable via env.
- Credential/password validation restricts usernames to `[A-Za-z0-9_]` and
  passwords to printable-safe chars (8-64) to avoid shell/SQL injection.
- Ready checks per engine (pg_isready / mysqladmin ping / mongosh ping) on
  auto-provision.

## Implementation Order
1. Initialize pnpm project + dependencies
2. Express server scaffold + config
3. Auth middleware (simple password)
4. Docker service (container lifecycle)
5. Engine services (pg, mysql, mongo, sqlite)
6. Database store (JSON file)
7. API routes
8. UI views (login, dashboard)
9. Frontend JS (interactions)
10. Dockerfile + docker-compose.yml

## Dependencies
- express
- dockerode
- bcryptjs
- express-session
- better-sqlite3
- dotenv
