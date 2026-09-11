import { Router } from 'express';
import { checkPassword } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!checkPassword(password)) return res.status(401).json({ error: 'Invalid password' });
  req.session.authenticated = true;
  return res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.authenticated) });
});

export default router;
