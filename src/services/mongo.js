import { withConnection } from './engines.js';

const ENGINE = 'mongo';

export async function provision(record) {
  await withConnection(ENGINE, (client) =>
    client.db(record.name).getCollection('_bootstrap').insertOne({ created: new Date() }),
  );
}

export async function createUser(record, username, password) {
  await withConnection(ENGINE, (client) =>
    client.db(record.name).command({
      createUser: username,
      pwd: password,
      roles: [{ role: 'readWrite', db: record.name }],
    }),
  );
}

export async function deleteUser(record, username) {
  await withConnection(ENGINE, (client) => client.db(record.name).command({ dropUser: username }));
}

export async function destroy(record) {
  await withConnection(ENGINE, (client) => client.db(record.name).dropDatabase());
}
