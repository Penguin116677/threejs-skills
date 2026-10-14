/**
 * DOM overlay: palette-driven colors, the break flow, and small extras.
 */
const BREAK_SECONDS = 60;

export function createUI({ onBreakChange }) {
  const root = document.documentElement;
  const body = document.body;
  const startBtn = document.getElementById('start-break');
  const endBtn = document.getElementById('end-break');
  const pill = document.getElementById('break-pill');
  const timeEl = document.getElementById('break-time');
  const howCard = document.getElementById('how-card');
  const toast = document.getElementById('toast');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  let onBreak = false;
  let endsAt = 0;
  let lastShown = -1;
  let toastTimer = 0;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function setBreak(on) {
    if (on === onBreak) return;
    onBreak = on;
    body.classList.toggle('on-break', on);
    closeHow();
    if (on) {
      endsAt = performance.now() + BREAK_SECONDS * 1000;
      lastShown = -1;
      pill.hidden = false;
      tickTimer();
      endBtn.focus({ preventScroll: true });
    } else {
      startBtn.focus({ preventScroll: true });
      // Keep the pill in the layout until its fade-out has finished.
      setTimeout(() => {
        if (!onBreak) pill.hidden = true;
      }, 600);
    }
    onBreakChange(on);
  }

  function tickTimer() {
    if (!onBreak) return;
    const left = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000 - 0.001));
    const shown = Math.min(left, BREAK_SECONDS - 1);
    if (shown !== lastShown) {
      timeEl.textContent = fmt(shown);
      lastShown = shown;
    }
    if (performance.now() >= endsAt) setBreak(false);
  }

  function closeHow() {
    howCard.classList.remove('open');
    setTimeout(() => {
      if (!howCard.classList.contains('open')) howCard.hidden = true;
    }, 300);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  startBtn.addEventListener('click', () => setBreak(true));
  endBtn.addEventListener('click', () => setBreak(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (onBreak) setBreak(false);
      closeHow();
    }
  });

  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.action === 'how') {
        if (howCard.classList.contains('open')) return closeHow();
        howCard.hidden = false;
        requestAnimationFrame(() => howCard.classList.add('open'));
      } else {
        showToast('more biomes are sprouting soon');
      }
    });
  });
  document.addEventListener('pointerdown', (e) => {
    if (howCard.classList.contains('open') && !e.target.closest('#how-card, [data-action="how"]')) closeHow();
  });

  // Only write CSS variables when a color actually changes.
  const cache = {};
  function setVar(name, value) {
    if (cache[name] !== value) {
      cache[name] = value;
      root.style.setProperty(name, value);
    }
  }
  const hex = (c) => '#' + c.getHexString();
  const rgba = (c, a) => {
    const n = c.getHex(); // sRGB
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  return {
    get onBreak() {
      return onBreak;
    },
    endBreak: () => setBreak(false),
    update(p) {
      tickTimer();
      const ui = p.ui;
      setVar('--title', hex(ui.title));
      setVar('--sub', hex(ui.sub));
      setVar('--nav', hex(ui.nav));
      setVar('--muted', hex(ui.muted));
      setVar('--btn-bg', hex(ui.btnBg));
      setVar('--btn-text', hex(ui.btnText));
      setVar('--leaf', hex(ui.leaf));
      setVar('--hint', hex(ui.hint));
      setVar('--glass-text', hex(ui.glassText));
      setVar('--glass', rgba(ui.glass, 0.55));
      setVar('--title-shadow', ui.shadow.toFixed(2));
      const bg = hex(p.horizon);
      if (cache.theme !== bg) {
        cache.theme = bg;
        themeMeta?.setAttribute('content', bg);
        body.style.background = bg;
      }
    }
  };
}
