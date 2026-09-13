import { withConnection } from './engines.js';

const ENGINE = 'postgres';

function psql(client, sql) {
  return client.query(sql);
}

export async function provision(record) {
  await withConnection(ENGINE, (client) => psql(client, `CREATE DATABASE "${record.name}"`));
}

export async function createUser(record, username, password) {
  await withConnection(ENGINE, async (client) => {
    await psql(client, `CREATE USER "${username}" WITH PASSWORD '${password}'`);
    await psql(client, `GRANT ALL PRIVILEGES ON DATABASE "${record.name}" TO "${username}"`);
  });
}

export async function deleteUser(_, username) {
  await withConnection(ENGINE, (client) => psql(client, `DROP USER IF EXISTS "${username}"`));
}

export async function destroy(record, users = []) {
  await withConnection(ENGINE, async (client) => {
    await psql(client, `DROP DATABASE IF EXISTS "${record.name}"`);
    for (const user of users) {
      await psql(client, `DROP USER IF EXISTS "${user.username}"`);
    }
  });
}
