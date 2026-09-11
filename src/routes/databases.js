import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../auth.js';
import { store } from '../store/db.js';
import { config } from '../config.js';
import * as postgres from '../services/postgres.js';
import * as mysql from '../services/mysql.js';
import * as mariadb from '../services/mariadb.js';
import * as mongo from '../services/mongo.js';

const router = Router();

const services = { postgres, mysql, mariadb, mongo };
const ENGINES = Object.keys(config.engines);
const NAME_RE = /^[a-z][a-z0-9_]{0,31}$/;
const USER_RE = /^[a-zA-Z0-9_]{1,32}$/;
const PASS_RE = /^[a-zA-Z0-9!@#$%^&*()_+\-.,?~]{8,64}$/;
const TEMPLATES = {
  postgres: 'postgres://USER:PASS@HOST:PORT/NAME',
  mysql: 'mysql://USER:PASS@HOST:PORT/NAME',
  mariadb: 'mariadb://USER:PASS@HOST:PORT/NAME',
  mongo: 'mongodb://USER:PASS@HOST:PORT/NAME',
};

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
}

function connectionInfo(record) {
  const cfg = config.engines[record.engine];
  return {
    host: config.host,
    port: cfg?.hostPort ?? '',
    template: TEMPLATES[record.engine] || '',
  };
}

function toApi(dbRow) {
  const users = store.listUsers(dbRow.id).map((u) => ({ id: u.id, username: u.username }));
  return { ...dbRow, users, ...connectionInfo(dbRow) };
}

function validCredentials(username, password) {
  if (username && !USER_RE.test(username)) return 'username must match /^[a-zA-Z0-9_]{1,32}$/';
  if (password && !PASS_RE.test(password))
    return 'password must be 8-64 chars using letters, digits, ! @ # $ % ^ & * ( ) _ + - . , ? ~';
  return null;
}

router.get('/', requireAuth, (req, res) => {
  res.json(store.listDatabases().map(toApi));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = store.getDatabase(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const detail = toApi(row);
  detail.users = store.listUsers(row.id).map((u) => ({
    id: u.id,
    username: u.username,
    password: u.password,
  }));
  return res.json(detail);
});

router.post('/', requireAuth, async (req, res) => {
  const { engine, name, username, password } = req.body || {};
  if (!ENGINES.includes(engine)) {
    return res.status(400).json({ error: `engine must be one of ${ENGINES.join(', ')}` });
  }
  if (!NAME_RE.test(name)) {
    return res.status(400).json({ error: 'name must match /^[a-z][a-z0-9_]{0,31}$/' });
  }
  const credentialError = validCredentials(username, password);
  if (credentialError) return res.status(400).json({ error: credentialError });
  if (store.findDatabase(engine, name)) {
    return res.status(409).json({ error: `${engine} database '${name}' already exists` });
  }

  const id = crypto.randomUUID();
  const record = { id, engine, name };
  store.createDatabase(record);

  try {
    await services[engine].provision(record);
    const uname = username || `db_${name.slice(0, 16)}`;
    const pass = password || generatePassword();
    await services[engine].createUser(record, uname, pass);
    const admin = store.createUser({
      id: crypto.randomUUID(),
      dbId: id,
      username: uname,
      password: pass,
    });
    store.setStatus(id, 'running');
    const row = store.getDatabase(id);
    return res.status(201).json({
      database: toApi(row),
      credentials: admin
        ? { id: admin.id, username: admin.username, password: admin.password }
        : null,
    });
  } catch (err) {
    store.setStatus(id, 'error');
    try {
      await services[engine].destroy(record);
    } catch {}
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const row = store.getDatabase(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!services[row.engine]) {
    return res.status(400).json({ error: `engine '${row.engine}' is not enabled` });
  }
  const users = store.listUsers(row.id);
  try {
    await services[row.engine].destroy(row, users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  store.deleteDatabaseUsers(row.id);
  store.deleteDatabase(row.id);
  return res.json({ ok: true });
});

router.post('/:id/users', requireAuth, async (req, res) => {
  const row = store.getDatabase(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { username, password } = req.body || {};
  const uname = username || `user_${crypto.randomBytes(4).toString('hex')}`;
  const pass = password || generatePassword();
  const credentialError = validCredentials(uname, password);
  if (credentialError) return res.status(400).json({ error: credentialError });
  if (store.findUser(row.id, uname))
    return res.status(409).json({ error: 'username already exists' });

  try {
    await services[row.engine].createUser(row, uname, pass);
    const created = store.createUser({
      id: crypto.randomUUID(),
      dbId: row.id,
      username: uname,
      password: pass,
    });
    return res
      .status(201)
      .json({ id: created.id, username: created.username, password: created.password });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/users/:uid', requireAuth, async (req, res) => {
  const row = store.getDatabase(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const user = store.getUser(row.id, req.params.uid);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    await services[row.engine].deleteUser(row, user.username);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  store.deleteUser(row.id, user.id);
  return res.json({ ok: true });
});

export default router;
