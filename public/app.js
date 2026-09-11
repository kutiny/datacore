const $ = (sel) => document.querySelector(sel);

function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `request failed (${res.status})`);
  return json;
}

/* ── Modal Engine ── */

function openDialog(html) {
  const d = document.createElement('dialog');
  d.innerHTML = html;
  document.body.appendChild(d);

  d.addEventListener('click', (e) => {
    if (e.target === d) d.close();
  });

  d.addEventListener('close', () => d.remove(), { once: true });

  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') d.close();
  });

  d.showModal();
  return d;
}

function wireCloseButtons(d) {
  d.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => d.close());
  });
}

/* ── Toast ── */

let toastContainer = null;

function toast(msg, type = 'success') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" aria-label="Dismiss">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  el.querySelector('.toast-close').addEventListener('click', () => el.remove());
  toastContainer.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    el.style.transition = 'all 0.15s';
    setTimeout(() => el.remove(), 150);
  }, 3500);
}

/* ── Login ── */

const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('[type="submit"]');
    const password = new FormData(loginForm).get('password');
    btn.classList.add('is-loading');
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
      window.location.href = '/';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.classList.remove('is-loading');
    }
  });
}

/* ── Logout ── */

const logoutBtn = $('#logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

/* ── Deploy Database Dialog ── */

const openCreate = $('#open-create');
if (openCreate) {
  openCreate.addEventListener('click', () => {
    let engines = [];
    try {
      engines = JSON.parse($('#engine-data')?.textContent || '[]');
    } catch {}
    const engineOptions = engines
      .map((e) => `<option value="${esc(e.value)}">${esc(e.label)}</option>`)
      .join('');

    const d = openDialog(`
      <div class="modal-header">
        <h3>Deploy database</h3>
        <button class="btn btn-ghost btn-sm" data-close aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="dc-engine">Engine</label>
            <select name="engine" id="dc-engine" required>
              ${engineOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="dc-name">Database name</label>
            <input name="name" id="dc-name"
                   pattern="[a-z][a-z0-9_]{0,31}"
                   title="lowercase letters, digits, underscores; max 32 chars"
                   autocomplete="off" required />
          </div>
          <details>
            <summary>Optional credentials</summary>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
              <div class="form-group">
                <label class="form-label" for="dc-user">Username</label>
                <input name="username" id="dc-user" autocomplete="off" placeholder="generated if empty" />
              </div>
              <div class="form-group">
                <label class="form-label" for="dc-pass">Password</label>
                <input name="password" id="dc-pass" type="password" autocomplete="new-password" placeholder="generated if empty" />
              </div>
            </div>
          </details>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Deploy</button>
        </div>
      </form>`);

    wireCloseButtons(d);

    d.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('[type="submit"]');
      const data = { engine: form.engine.value, name: form.name.value };
      const username = form.username.value.trim();
      const password = form.password.value;
      if (username) data.username = username;
      if (password) data.password = password;

      submitBtn.classList.add('is-loading');
      try {
        const result = await api('/api/databases', { method: 'POST', body: JSON.stringify(data) });
        d.close();

        if (result.credentials) {
          showSuccess({
            title: 'Database deployed',
            fields: [
              ['Engine', result.database.engine],
              ['Name', result.database.name],
              ['Host', `${result.database.host}:${result.database.port}`],
              ['User', result.credentials.username],
              ['Password', result.credentials.password, true],
              ['Template', result.database.template],
            ],
            onClose: () => window.location.reload(),
          });
        } else {
          toast(`${result.database.engine} database "${result.database.name}" created`);
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        submitBtn.classList.remove('is-loading');
      }
    });
  });
}

/* ── Secret value with show/hide toggle ── */

const EYE_OPEN =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function secretField(value) {
  return `
    <span class="secret">
      <span class="success-value" data-copy="${esc(value)}" data-original="${esc(value)}" data-hidden="1">••••••••</span>
      <button type="button" class="secret-toggle" data-secret aria-label="Show password">${EYE_OPEN}</button>
    </span>`;
}

function wireSecretToggles(d) {
  d.querySelectorAll('[data-secret]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.closest('.secret').querySelector('.success-value');
      const reveal = val.dataset.hidden === '1';
      val.textContent = reveal ? val.dataset.original : '••••••••';
      val.dataset.hidden = reveal ? '0' : '1';
      btn.innerHTML = reveal ? EYE_CLOSED : EYE_OPEN;
      btn.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    });
  });
}

/* ── Success Dialog ── */

function showSuccess({ title, fields, onClose }) {
  const rows = fields
    .map(([label, value, secret]) => {
      const val = secret
        ? secretField(value)
        : `<span class="success-value" data-copy="${esc(value)}">${esc(value)}</span>`;
      return `
      <div class="success-field">
        <span class="success-label">${label}</span>
        ${val}
      </div>`;
    })
    .join('');

  const d = openDialog(`
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="btn btn-ghost btn-sm" data-close aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="success-panel">${rows}</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" data-close>Close</button>
    </div>`);

  wireCloseButtons(d);
  wireSecretToggles(d);

  d.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.copy).then(() => {
        const orig = el.textContent;
        el.textContent = 'Copied';
        setTimeout(() => (el.textContent = orig), 1000);
      });
    });
  });

  if (onClose) {
    d.addEventListener('close', onClose, { once: true });
  }
}

/* ── Confirm Dialog ── */

function showConfirm({ title, message, confirmLabel, onConfirm }) {
  const d = openDialog(`
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="btn btn-ghost btn-sm" data-close aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body">
      <p class="confirm-message">${message}</p>
    </div>
    <div class="modal-footer">
      <button class="btn" data-close>Cancel</button>
      <button class="btn btn-danger" data-confirm>${confirmLabel || 'Delete'}</button>
    </div>`);

  wireCloseButtons(d);

  d.querySelector('[data-confirm]').addEventListener('click', () => {
    d.close();
    onConfirm();
  });
}

/* ── Database Table Actions ── */

const table = $('#db-table');
if (table) {
  table.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { id, action } = btn.dataset;

    if (action === 'delete') {
      const row = btn.closest('tr');
      const name = row?.querySelector('.db-link')?.textContent || 'this database';
      showConfirm({
        title: 'Delete database',
        message: `Permanently delete <strong>${name}</strong> and all its users? This cannot be undone.`,
        confirmLabel: 'Delete',
        onConfirm: () => {
          api(`/api/databases/${id}`, { method: 'DELETE' })
            .then(() => {
              toast(`Deleted "${name}"`);
              window.location.reload();
            })
            .catch((err) => toast(err.message, 'error'));
        },
      });
    }
  });
}
