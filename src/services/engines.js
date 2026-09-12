import pg from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const PROBES = {
  postgres: (client) => client.query('SELECT 1'),
  mysql: (conn) => conn.query('SELECT 1'),
  mariadb: (conn) => conn.query('SELECT 1'),
  mongo: (client) => client.db('admin').command({ ping: 1 }),
};

const CLOSE = {
  postgres: (client) => client.end(),
  mysql: (conn) => conn.end(),
  mariadb: (conn) => conn.end(),
  mongo: (client) => client.close(),
};

export async function connect(engine) {
  const cfg = config.engines[engine];

  switch (engine) {
    case 'postgres': {
      const client = new pg.Client({
        host: cfg.host,
        port: cfg.port,
        user: cfg.superUser,
        password: cfg.superPassword,
        database: 'postgres',
        connectionTimeoutMillis: 6000,
      });
      await client.connect();
      return client;
    }
    case 'mysql':
    case 'mariadb': {
      const conn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.superUser,
        password: cfg.superPassword,
        connectTimeout: 6000,
      });
      return conn;
    }
    case 'mongo': {
      const auth =
        cfg.superUser && cfg.superPassword
          ? `${encodeURIComponent(cfg.superUser)}:${encodeURIComponent(cfg.superPassword)}@`
          : '';
      const client = new MongoClient(`mongodb://${auth}${cfg.host}:${cfg.port}/?authSource=admin`, {
        serverSelectionTimeoutMS: 6000,
      });
      await client.connect();
      return client;
    }
    default:
      throw new Error(`unknown engine '${engine}'`);
  }
}

export async function withConnection(engine, fn) {
  const client = await connect(engine);
  try {
    return await fn(client);
  } finally {
    await CLOSE[engine](client).catch(() => {});
  }
}

export async function getEngineStatuses() {
  const out = {};
  for (const engine of Object.keys(config.engines)) {
    const cfg = config.engines[engine];
    try {
      await withConnection(engine, (client) => PROBES[engine](client));
      out[engine] = { engine, status: 'running', hostPort: cfg.hostPort };
    } catch (error) {
      console.log(error);
      out[engine] = { engine, status: 'error', hostPort: cfg.hostPort };
    }
  }
  return out;
}
