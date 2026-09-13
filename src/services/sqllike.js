import { withConnection } from './engines.js';

function run(conn, sql) {
  return conn.query(sql);
}

export function makeSqlService(engine) {
  return {
    async provision(record) {
      await withConnection(engine, (conn) =>
        run(
          conn,
          `CREATE DATABASE \`${record.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        ),
      );
    },
    async createUser(record, username, password) {
      await withConnection(engine, async (conn) => {
        await run(conn, `CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'`);
        await run(conn, `GRANT ALL PRIVILEGES ON \`${record.name}\`.* TO '${username}'@'%'`);
        await run(conn, 'FLUSH PRIVILEGES');
      });
    },
    async deleteUser(_, username) {
      await withConnection(engine, async (conn) => {
        await run(conn, `DROP USER IF EXISTS '${username}'@'%'`);
        await run(conn, 'FLUSH PRIVILEGES');
      });
    },
    async destroy(record, users = []) {
      await withConnection(engine, async (conn) => {
        await run(conn, `DROP DATABASE IF EXISTS \`${record.name}\``);
        for (const user of users) {
          await run(conn, `DROP USER IF EXISTS '${user.username}'@'%'`);
        }
        await run(conn, 'FLUSH PRIVILEGES');
      });
    },
  };
}
