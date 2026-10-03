import { withConnection } from './engines.js';
import { config } from '../config.js';

const ENGINE = 'postgres';
const ADMIN = config.engines[ENGINE].superUser;

function psql(client, sql, params) {
  return client.query(sql, params);
}

async function ownerOf(client, database) {
  const { rows } = await psql(
    client,
    'SELECT pg_catalog.pg_get_userbyid(datdba) AS owner FROM pg_catalog.pg_database WHERE datname = $1',
    [database],
  );
  return rows[0]?.owner;
}

async function grantSchemaAccess(client, username) {
  await psql(client, `GRANT USAGE, CREATE ON SCHEMA public TO "${username}"`);
  await psql(client, `GRANT ALL ON ALL TABLES IN SCHEMA public TO "${username}"`);
  await psql(client, `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${username}"`);
  await psql(
    client,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${username}"`,
  );
  await psql(
    client,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${username}"`,
  );
}

export async function provision(record) {
  await withConnection(ENGINE, async (client) => {
    await psql(client, `CREATE DATABASE "${record.name}"`);
    await psql(client, `REVOKE CONNECT, TEMPORARY ON DATABASE "${record.name}" FROM PUBLIC`);
  });
}

export async function createUser(record, username, password) {
  await withConnection(ENGINE, async (client) => {
    await psql(client, `CREATE USER "${username}" WITH PASSWORD '${password}'`);
    await psql(client, `GRANT ALL PRIVILEGES ON DATABASE "${record.name}" TO "${username}"`);
    if ((await ownerOf(client, record.name)) === ADMIN) {
      await psql(client, `ALTER DATABASE "${record.name}" OWNER TO "${username}"`);
    }
  });
  await withConnection(ENGINE, (client) => grantSchemaAccess(client, username), {
    database: record.name,
  });
}

export async function deleteUser(record, username) {
  await withConnection(ENGINE, async (client) => {
    if ((await ownerOf(client, record.name)) === username) {
      await psql(client, `ALTER DATABASE "${record.name}" OWNER TO "${ADMIN}"`);
    }
  });
  await withConnection(
    ENGINE,
    async (client) => {
      await psql(client, `REASSIGN OWNED BY "${username}" TO "${ADMIN}"`);
      await psql(client, `DROP OWNED BY "${username}"`);
      await psql(client, `DROP USER IF EXISTS "${username}"`);
    },
    {
      database: record.name,
    },
  );
}

export async function destroy(record, users = []) {
  await withConnection(ENGINE, async (client) => {
    await psql(client, `DROP DATABASE IF EXISTS "${record.name}"`);
    for (const user of users) {
      await psql(client, `DROP USER IF EXISTS "${user.username}"`);
    }
  });
}
