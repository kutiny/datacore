import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENGINE_DEFS = [
  {
    key: 'postgres',
    label: 'PostgreSQL',
    hostVar: 'POSTGRES_HOST',
    connPortVar: 'POSTGRES_CONN_PORT',
    connPortDefault: 5432,
    hostPortVar: 'POSTGRES_PORT',
    hostPortDefault: 5432,
    superUserVar: 'POSTGRES_SUPERUSER',
    superUserDefault: 'postgres',
    superPasswordVar: 'POSTGRES_SUPERPASSWORD',
    superPasswordDefault: 'datacore_pass',
  },
  {
    key: 'mysql',
    label: 'MySQL',
    hostVar: 'MYSQL_HOST',
    connPortVar: 'MYSQL_CONN_PORT',
    connPortDefault: 3306,
    hostPortVar: 'MYSQL_PORT',
    hostPortDefault: 3306,
    superUserVar: 'MYSQL_SUPERUSER',
    superUserDefault: 'root',
    superPasswordVar: 'MYSQL_SUPERPASSWORD',
    superPasswordLegacyVar: 'MYSQL_ROOT_PASSWORD',
    superPasswordDefault: 'datacore_pass',
  },
  {
    key: 'mariadb',
    label: 'MariaDB',
    hostVar: 'MARIADB_HOST',
    connPortVar: 'MARIADB_CONN_PORT',
    connPortDefault: 3306,
    hostPortVar: 'MARIADB_PORT',
    hostPortDefault: 3306,
    superUserVar: 'MARIADB_SUPERUSER',
    superUserDefault: 'root',
    superPasswordVar: 'MARIADB_SUPERPASSWORD',
    superPasswordLegacyVar: 'MARIADB_ROOT_PASSWORD',
    superPasswordDefault: 'datacore_pass',
  },
  {
    key: 'mongo',
    label: 'MongoDB',
    hostVar: 'MONGO_HOST',
    connPortVar: 'MONGO_CONN_PORT',
    connPortDefault: 27017,
    hostPortVar: 'MONGO_PORT',
    hostPortDefault: 27017,
    superUserVar: 'MONGO_SUPERUSER',
    superPasswordVar: 'MONGO_SUPERPASSWORD',
  },
];

const engines = {};
for (const def of ENGINE_DEFS) {
  const host = process.env[def.hostVar];
  if (!host) continue;
  const engine = {
    name: def.key,
    label: def.label,
    host,
    port: Number(process.env[def.connPortVar] || def.connPortDefault),
    hostPort: Number(process.env[def.hostPortVar] || def.hostPortDefault),
  };
  if (def.superUserVar || def.superUserDefault) {
    engine.superUser = process.env[def.superUserVar] || def.superUserDefault || '';
  }
  if (def.superPasswordVar || def.superPasswordDefault) {
    engine.superPassword =
      process.env[def.superPasswordVar] ||
      process.env[def.superPasswordLegacyVar] ||
      def.superPasswordDefault ||
      '';
  }
  engines[def.key] = engine;
}

export const config = {
  port: Number(process.env.PORT || process.env.DATACORE_PORT || 3737),
  host: process.env.DATACORE_HOST || 'localhost',
  password: process.env.DATACORE_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  cookieMaxAge: Number(process.env.COOKIE_MAX_AGE || 1000 * 60 * 60 * 24 * 7),
  dataDir: path.resolve(__dirname, '..', process.env.DATA_DIR || 'data'),
  engines,
};

export const passwordHash = config.password ? bcrypt.hashSync(config.password, 10) : null;
