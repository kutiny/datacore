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
/* eslint-enable */
