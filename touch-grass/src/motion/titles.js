import { ease, progress } from './easing.js';
import { BEATS } from './timeline.js';

/**
 * Typography layer, driven purely by the timeline clock so it renders
 * identically in real-time playback and in frame-by-frame capture.
 */
const LETTER = { dur: 0.95, stagger: 0.035, rise: 0.42, blur: 10 };
const LETTER_OUT = { dur: 0.5, stagger: 0.02, lift: 0.16, blur: 6 };
const WORD = { dur: 0.85, stagger: 0.07, rise: 0.7, blur: 6 };
const WORD_OUT = { dur: 0.42, stagger: 0.03 };

function split(el, unit) {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);
  const parts = unit === 'letter' ? [...text] : text.split(' ');
  return parts.map((part, i) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = part === ' ' ? ' ' : part;
    el.appendChild(span);
    if (unit === 'word' && i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    return span;
  });
}

// Write styles only when they change (they are static most of the film).
function apply(span, opacity, y, blur) {
  const key = `${opacity.toFixed(3)}|${y.toFixed(3)}|${blur.toFixed(2)}`;
  if (span._k === key) return;
  span._k = key;
  span.style.opacity = opacity;
  span.style.transform = `translate3d(0, ${y}em, 0)`;
  span.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
}

/** Combined in/out state for one element in a staggered group. */
function state(t, i, n, inAt, outAt, inSpec, outSpec) {
  const a = ease.enter(progress(t, inAt + i * inSpec.stagger, inSpec.dur));
  // Exits run in reverse order: the last letter leaves first.
  const b = outAt == null ? 0 : ease.exit(progress(t, outAt + (n - 1 - i) * outSpec.stagger, outSpec.dur));
  return { a, b };
}

export function createTitles(root) {
  const title = root.querySelector('.title');
  const sub = root.querySelector('.sub');
  const clock = root.querySelector('.clock');
  const clockTime = clock.querySelector('.clock-time');
  const clockAmPm = clock.querySelector('.clock-ampm');
  const letters = split(title, 'letter');
  const words = split(sub, 'word');
  let lastClock = '';
  let lastColor = '';

  return {
    update(t, palette, timeOfDay, scale) {
      const end = t >= BEATS.endTitle.in - 0.5;
      const tIn = end ? BEATS.endTitle.in : BEATS.title.in;
      const tOut = end ? null : BEATS.title.out;
      const sIn = end ? BEATS.endSub.in : BEATS.sub.in;
      const sOut = end ? null : BEATS.sub.out;

      letters.forEach((span, i) => {
        const { a, b } = state(t, i, letters.length, tIn, tOut, LETTER, LETTER_OUT);
        apply(span, a * (1 - b), (1 - a) * LETTER.rise - b * LETTER_OUT.lift, ((1 - a) * LETTER.blur + b * LETTER_OUT.blur) * scale);
      });
      words.forEach((span, i) => {
        const { a, b } = state(t, i, words.length, sIn, sOut, WORD, WORD_OUT);
        apply(span, a * (1 - b), (1 - a) * WORD.rise - b * 0.3, ((1 - a) * WORD.blur + b * 4) * scale);
      });

      // Clock: a quiet secondary layer that ticks with the light.
      const c = ease.enter(progress(t, BEATS.clock.in, 0.7)) * (1 - ease.exit(progress(t, BEATS.clock.out, 0.45)));
      clock.style.opacity = c;
      clock.style.transform = `translate3d(0, ${(1 - c) * 0.6}em, 0)`;
      const minutes = Math.round(13 * 60 + timeOfDay * (10 * 60 + 40));
      const h24 = Math.floor(minutes / 60);
      const h = ((h24 + 11) % 12) + 1;
      const label = `${h}:${String(minutes % 60).padStart(2, '0')}`;
      if (label !== lastClock) {
        lastClock = label;
        clockTime.textContent = label;
        clockAmPm.textContent = h24 >= 12 ? 'pm' : 'am';
      }

      const color = '#' + palette.ui.title.getHexString();
      if (color !== lastColor) {
        lastColor = color;
        root.style.setProperty('--ink', color);
        root.style.setProperty('--ink-soft', '#' + palette.ui.sub.getHexString());
        root.style.setProperty('--ink-shadow', palette.ui.shadow.toFixed(2));
      }
    }
  };
}
