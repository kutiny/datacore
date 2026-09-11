import bcrypt from 'bcryptjs';
import { passwordHash } from './config.js';

export function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login');
}

export function checkPassword(password) {
  if (!passwordHash) return false;
  return bcrypt.compareSync(password || '', passwordHash);
}
