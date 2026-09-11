# 002 - TCP drivers as the only engine-control path

Status: implemented

## Goal

Engines (postgres / mysql / mongo) become user-defined services in `docker-compose.yml`.
DataCore connects to them over TCP with real DB drivers (`pg`, `mysql2`, `mongodb`) — the
only way to manage databases/users. The old docker-socket orchestration (panel deploys
container images itself, then `docker exec` + engine CLIs) is removed entirely.

## Decisions

- Topology: single compose project (panel + engines together).
- Panel reaches engines via compose service names: `postgres`, `mysql`, `mongo`.
- Per-engine connection host/port are env-overridable (`*_HOST`, `*_CONN_PORT`) so the
  panel can also run on the host (e.g. `POSTGRES_HOST=localhost`).
- Published host ports (`POSTGRES_PORT`/`MYSQL_PORT`/`MONGO_PORT`) remain config-driven
  and are only used for display + client connection details; the panel's internal port is
  the image port (`5432/3306/27017`).

## Changes

- `package.json`: remove `dockerode`, add `pg`, `mysql2`, `mongodb`; `pnpm install`.
- `src/config.js`: drop `dockerSocket`, container/image/volume fields; add per-engine
  `{ name, host, port, hostPort, superUser, superPassword }`.
- `src/services/docker.js` → deleted; `src/services/engines.js` provides
  `connect(engine)` and `getEngineStatuses()` (TCP + auth probe → running/stopped/error).
- `src/services/postgres.js|mysql.js|mongo.js`: rewritten with drivers, same API surface
  (`provision`, `createUser`, `deleteUser`, `destroy`) so `routes/databases.js` is untouched.
- `src/routes/engines.js` + `src/index.js`: import statuses from `services/engines.js`.
- `docker-compose.yml`: add `postgres`/`mysql`/`mongo` services with volumes + host port
  maps; `datacore` drops the docker.sock mount and `DOCKER_SOCKET` env; `depends_on` engines.
- `.env` / `.env.example`: remove `DOCKER_SOCKET`, `*_IMAGE`; add `*_HOST` (+ optional
  `*_CONN_PORT`).
- Status labels narrowed to `running`/`stopped`/`error` in `src/index.js`.

## Notes

- Port conflicts are no longer auto-detected (was `docker inspect`-based); they surface as
  plain connection errors at deploy time.
- The mongo image runs without auth by default, so mongo connections carry no superuser
  credentials.