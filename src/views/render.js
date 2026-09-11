import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWS = __dirname;
const cache = {};

export function render(template, data = {}) {
  if (!cache[template]) cache[template] = fs.readFileSync(path.join(VIEWS, template), 'utf8');
  return cache[template].replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? String(data[key]) : match,
  );
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
