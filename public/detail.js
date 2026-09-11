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

function wireSecretToggles(root) {
  root.querySelectorAll('[data-secret]').forEach((btn) => {
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

/* page state */
const dbId = document.body.dataset.dbId;
let db = null;

const SCHEMES = { postgres: 'postgres', mysql: 'mysql', mariadb: 'mariadb', mongo: 'mongodb' };

function target() {
  const scheme = SCHEMES[db.engine] || db.engine;
  return `${scheme}://${db.host}:${db.port}/${db.name}`;
}

/* connection panel */
function renderConnection() {
  const fields = [
    ['Engine', db.engine],
    ['Host', db.host],
    ['Port', String(db.port)],
  ]
    .map(
      ([label, value]) => `
      <div class="success-field">
        <span class="success-label">${label}</span>
        <span class="success-value" data-copy="${esc(value)}">${esc(value)}</span>
      </div>`,
    )
    .join('');

  $('#conn-fields').innerHTML = fields;

  const t = $('#conn-target');
  t.textContent = target();
  t.dataset.copy = target();
}

/* users table */
function renderUsers() {
  const tbody = $('#user-table');
  tbody.innerHTML = db.users
    .map(
      (u) => `
      <tr data-uid="${u.id}">
        <td class="db-name">${esc(u.username)}</td>
        <td>${secretField(u.password)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-danger" data-del-user="${u.id}">Remove</button>
        </td>
      </tr>`,
    )
    .join('');

  $('#user-count').textContent = db.users.length;
  $('#user-empty').hidden = db.users.length > 0;
  wireSecretToggles(tbody);

  tbody.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.copy).then(() => {
        const orig = el.textContent;
        el.textContent = 'Copied';
        setTimeout(() => (el.textContent = orig), 1000);
      });
    });
  });
}

/* add user */
function openAddUser() {
  const d = openDialog(`
    <div class="modal-header">
      <h3>Add user</h3>
      <button class="btn btn-ghost btn-sm" data-close aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <form>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="au-name">Username</label>
          <input id="au-name" name="username" placeholder="generated if empty" autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="form-label" for="au-pass">Password</label>
          <input id="au-pass" name="password" type="password" placeholder="generated if empty" autocomplete="new-password" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Add user</button>
      </div>
    </form>`);

  wireCloseButtons(d);

  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    const uname = d.querySelector('#au-name').value.trim();
    const pass = d.querySelector('#au-pass').value;
    if (uname) body.username = uname;
    if (pass) body.password = pass;

    const btn = d.querySelector('[type="submit"]');
    btn.classList.add('is-loading');
    try {
      const created = await api(`/api/databases/${dbId}/users`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      d.close();
      db = await api(`/api/databases/${dbId}`);
      renderUsers();
      toast(`User "${created.username}" added`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.classList.remove('is-loading');
    }
  });
}

/* delete user */
function deleteUser(uid, username) {
  showConfirm({
    title: 'Remove user',
    message: `Permanently remove user <strong>${esc(username)}</strong>?`,
    confirmLabel: 'Remove',
    onConfirm: () => {
      api(`/api/databases/${dbId}/users/${uid}`, { method: 'DELETE' })
        .then(async () => {
          db = await api(`/api/databases/${dbId}`);
          renderUsers();
          toast(`Removed "${username}"`);
        })
        .catch((err) => toast(err.message, 'error'));
    },
  });
}

/* boot */
$('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  window.location.href = '/login';
});

$('#open-add-user').addEventListener('click', openAddUser);

$('#user-table').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-del-user]');
  if (btn) {
    const row = btn.closest('tr');
    const username = row?.querySelector('.db-name')?.textContent || 'user';
    deleteUser(btn.dataset.delUser, username);
  }
});

(async () => {
  try {
    db = await api(`/api/databases/${dbId}`);
    renderConnection();
    renderUsers();
  } catch (err) {
    if (err.message === 'request failed (401)' || err.message.includes('logged in')) {
      window.location.href = '/login';
    } else {
      toast(err.message, 'error');
    }
  }
})();
