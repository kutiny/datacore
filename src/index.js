import express from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { requireAuth } from './auth.js';
import { store } from './store/db.js';
import { getEngineStatuses } from './services/engines.js';
import { render, escapeHtml } from './views/render.js';
import authRoutes from './routes/auth.js';
import databasesRoutes from './routes/databases.js';
import enginesRoutes from './routes/engines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
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

app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  const engineChips = Object.keys(config.engines)
    .map((k) => {
      const e = config.engines[k];
      return `
        <div class="auth-engine">
          <span class="engine-mark engine-mark-${k}">${ENGINE_MARKS[k] || k.slice(0, 1)}</span>
          <span class="auth-engine-name">${e.label}</span>
          <span class="auth-engine-port">${e.host}:${e.hostPort}</span>
        </div>`;
    })
    .join('');
  return res.send(render('login.html', { engineChips }));
});

app.get('/', requireAuth, async (_, res, next) => {
  try {
    const dbs = store.listDatabases();
    let statuses = {};
    try {
      statuses = await getEngineStatuses();
    } catch {}

    const engineCards = Object.keys(config.engines)
      .map((engine) => {
        const st = statuses[engine] || {};
        const status = st.status || 'unknown';
        const label = STATUS_LABELS[status] || status;
        return `
          <div class="card engine" data-engine="${engine}">
            <div class="engine-head">
              <div class="engine-id">
                <span class="engine-mark engine-mark-${engine}">${ENGINE_MARKS[engine] || engine.slice(0, 1)}</span>
                <div>
                  <div class="engine-name">${engine}</div>
                  <div class="engine-port">${config.engines[engine]?.host ?? ''}:${st.hostPort || config.engines[engine]?.hostPort || ''}</div>
                </div>
              </div>
              <span class="badge status-${status}">${label}</span>
            </div>
          </div>`;
      })
      .join('');

    const dbRows = dbs
      .map((db) => {
        const users = store.listUsers(db.id);
        const label = STATUS_LABELS[db.status] || db.status;
        return `
          <tr data-id="${db.id}">
            <td><span class="badge engine-${db.engine}">${db.engine}</span></td>
            <td><a class="db-link" href="/databases/${db.id}">${escapeHtml(db.name)}</a></td>
            <td><span class="badge status-${db.status}">${label}</span></td>
            <td>${users.length}</td>
            <td class="actions">
              <a class="btn btn-sm" href="/databases/${db.id}">Manage</a>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${db.id}">Delete</button>
            </td>
          </tr>`;
      })
      .join('');

    res.send(
      render('dashboard.html', {
        engineCards,
        dbRows,
        dbCount: dbs.length,
        emptyState: dbs.length ? 'hidden' : '',
        enginesJson: JSON.stringify(
          Object.keys(config.engines).map((k) => ({
            value: k,
            label: config.engines[k].label,
          })),
        ),
      }),
    );
  } catch (err) {
    next(err);
  }
});

app.get('/databases/:id', requireAuth, (req, res, next) => {
  try {
    const db = store.getDatabase(req.params.id);
    if (!db) return res.status(404).send('Database not found');
    return res.send(
      render('detail.html', {
        dbId: db.id,
        engine: db.engine,
        engineMark: ENGINE_MARKS[db.engine] || db.engine.slice(0, 1),
        name: db.name,
        status: db.status,
        statusLabel: STATUS_LABELS[db.status] || db.status,
        port: config.engines[db.engine]?.hostPort ?? '',
      }),
    );
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
