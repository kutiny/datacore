import express from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { requireAuth } from './auth.js';
import { store } from './store/db.js';
import { getEngineStatuses } from './services/engines.js';
import authRoutes from './routes/auth.js';
import databasesRoutes from './routes/databases.js';
import enginesRoutes from './routes/engines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: config.cookieMaxAge },
  }),
);
app.use(express.static(path.resolve(__dirname, '..', 'public')));

const STATUS_LABELS = {
  running: 'Running',
  error: 'Error',
  unknown: 'Unknown',
};

const ENGINE_MARKS = {
  postgres: 'Pg',
  mysql: 'My',
  mariadb: 'Ma',
  mongo: 'Mo',
};

function engineView(statuses = {}) {
  return Object.keys(config.engines).map((key) => {
    const cfg = config.engines[key];
    const st = statuses[key] || {};
    const status = st.status || 'unknown';
    return {
      key,
      label: cfg.label,
      mark: ENGINE_MARKS[key] || key.slice(0, 1),
      host: cfg.host,
      hostPort: cfg.hostPort,
      port: st.hostPort || cfg.hostPort,
      status,
      statusLabel: STATUS_LABELS[status] || status,
    };
  });
}

function databaseView(db) {
  return {
    id: db.id,
    engine: db.engine,
    engineMark: ENGINE_MARKS[db.engine] || db.engine.slice(0, 1),
    name: db.name,
    status: db.status,
    statusLabel: STATUS_LABELS[db.status] || db.status,
    userCount: store.listUsers(db.id).length,
  };
}

app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  return res.render('login', { engines: engineView() });
});

app.get('/', requireAuth, async (_, res, next) => {
  try {
    const dbs = store.listDatabases();
    let statuses = {};
    try {
      statuses = await getEngineStatuses();
    } catch {}

    return res.render('dashboard', {
      engines: engineView(statuses),
      dbs: dbs.map(databaseView),
      dbCount: dbs.length,
      enginesJson: JSON.stringify(
        Object.keys(config.engines).map((k) => ({
          value: k,
          label: config.engines[k].label,
        })),
      ),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/databases/:id', requireAuth, (req, res, next) => {
  try {
    const db = store.getDatabase(req.params.id);
    if (!db) return res.status(404).send('Database not found');
    return res.render('detail', databaseView(db));
  } catch (err) {
    next(err);
  }
});

app.use('/api', authRoutes);
app.use('/api/databases', databasesRoutes);
app.use('/api/engines', enginesRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: err.message });
  return res.status(500).send('Internal Server Error');
});

app.listen(config.port, () => {
  console.log(`DataCore listening on http://localhost:${config.port}`);
});
