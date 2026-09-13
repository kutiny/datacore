/* eslint-disable */
/* ── Scroll reveal ─────────────────────────────────────── */
(() => {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length || prefersReduced)
    return reveals.forEach((el) => el.classList.add('visible'));

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  reveals.forEach((el) => io.observe(el));
})();

/* ── Mobile nav ────────────────────────────────────────── */
(() => {
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobile-menu');
  if (!burger || !menu) return;

  const toggle = (open) => {
    const next = open ?? menu.hidden;
    menu.hidden = !next;
    burger.setAttribute('aria-expanded', String(next));
  };

  burger.addEventListener('click', () => toggle());
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) toggle(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) toggle(false);
  });
})();

/* ── Footer year ───────────────────────────────────────── */
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

/* ── Install method tabs ───────────────────────────────── */
(() => {
  const tabs = Array.from(document.querySelectorAll('.install-tab'));
  if (!tabs.length) return;

  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

  const select = (tab) => {
    tabs.forEach((t, i) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
})();
/* eslint-enable */
