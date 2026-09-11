import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

fs.mkdirSync(config.dataDir, { recursive: true });

const db = new Database(path.join(config.dataDir, 'datacore.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    engine TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'provisioning',
    created_at INTEGER NOT NULL,
    UNIQUE (engine, name)
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    db_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const mapDb = (r) =>
  r && { id: r.id, engine: r.engine, name: r.name, status: r.status, createdAt: r.created_at };
const mapUser = (r) =>
  r && {
    id: r.id,
    dbId: r.db_id,
    username: r.username,
    password: r.password,
    createdAt: r.created_at,
  };

const stmts = {
  listDbs: db.prepare('SELECT * FROM databases ORDER BY created_at DESC'),
  getDb: db.prepare('SELECT * FROM databases WHERE id = ?'),
  findDb: db.prepare('SELECT * FROM databases WHERE engine = ? AND name = ?'),
  createDb: db.prepare(
    'INSERT INTO databases (id, engine, name, status, created_at) VALUES (?, ?, ?, ?, ?)',
  ),
  setStatus: db.prepare('UPDATE databases SET status = ? WHERE id = ?'),
  deleteDb: db.prepare('DELETE FROM databases WHERE id = ?'),
  listUsers: db.prepare('SELECT * FROM users WHERE db_id = ?'),
  getUser: db.prepare('SELECT * FROM users WHERE id = ? AND db_id = ?'),
  findUser: db.prepare('SELECT * FROM users WHERE db_id = ? AND username = ?'),
  createUser: db.prepare(
    'INSERT INTO users (id, db_id, username, password, created_at) VALUES (?, ?, ?, ?, ?)',
  ),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ? AND db_id = ?'),
  deleteDbUsers: db.prepare('DELETE FROM users WHERE db_id = ?'),
};

export const store = {
  listDatabases() {
    return stmts.listDbs.all().map(mapDb);
  },
  getDatabase(id) {
    return mapDb(stmts.getDb.get(id));
  },
  findDatabase(engine, name) {
    return mapDb(stmts.findDb.get(engine, name));
  },
  createDatabase({ id, engine, name }) {
    stmts.createDb.run(id, engine, name, 'provisioning', Date.now());
    return this.getDatabase(id);
  },
  setStatus(id, status) {
    stmts.setStatus.run(status, id);
  },
  deleteDatabase(id) {
    stmts.deleteDb.run(id);
  },
  listUsers(dbId) {
    return stmts.listUsers.all(dbId).map(mapUser);
  },
  getUser(dbId, userId) {
    return mapUser(stmts.getUser.get(userId, dbId));
  },
  findUser(dbId, username) {
    return mapUser(stmts.findUser.get(dbId, username));
  },
  createUser({ id, dbId, username, password }) {
    stmts.createUser.run(id, dbId, username, password, Date.now());
    return this.getUser(dbId, id);
  },
  deleteUser(dbId, userId) {
    stmts.deleteUser.run(userId, dbId);
  },
  deleteDatabaseUsers(dbId) {
    stmts.deleteDbUsers.run(dbId);
  },
};
