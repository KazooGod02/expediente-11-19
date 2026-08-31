/* ════════════════════════════════════════════════════════════
   core.js — utilidades, audio, ventanas y avisos
   ════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   ⚠️ LOGO ASCII — sustituye este bloque por tu K.
   Cualquier generador de "ASCII art" sirve: pega el resultado
   entre las comillas y respeta los saltos de línea.
   ───────────────────────────────────────────────────────────── */
export const ASCII_K = String.raw`
   ██╗  ██╗    ██████╗    ██████╗
   ██║ ██╔╝    ██╔══██╗   ██╔══██╗
   █████╔╝     ██████╔╝   ██║  ██║
   ██╔═██╗     ██╔═══╝    ██║  ██║
   ██║  ██╗ ██╗██║     ██╗██████╔╝
   ╚═╝  ╚═╝ ╚═╝╚═╝     ╚═╝╚═════╝
`;

/* ── utilidades ──────────────────────────────────────────── */
export const $ = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const pad = (n, w = 2) => String(n).padStart(w, '0');
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const norm = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = () => matchMedia('(max-width: 760px)').matches;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export const store = {
  get(k, d = null) {
    try { const v = localStorage.getItem('kpd.' + k); return v === null ? d : JSON.parse(v); }
    catch { return d; }
  },
  set(k, v) { try { localStorage.setItem('kpd.' + k, JSON.stringify(v)); } catch { /* modo privado */ } },
};

export function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const GLYPHS = '▚▞▛▟█▓▒░ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\|<>#@$%&*+=~';
export const noise = (n) =>
  Array.from({ length: n }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');

let toastTimer;
export function toast(msg, ms = 2800) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/** Escribe un texto letra a letra dentro de un elemento. */
export async function typeInto(el, text, speed = 12) {
  if (REDUCED) { el.textContent = text; return; }
  for (let i = 0; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    if (i % 3 === 0) await wait(speed);
  }
}

/** Resuelve un texto desde el ruido, como si se descifrase. */
export async function resolveInto(el, text, steps = 6, ms = 26) {
  if (REDUCED) { el.textContent = text; return; }
  for (let s = 0; s <= steps; s++) {
    const shown = Math.floor((text.length * s) / steps);
    el.textContent = text.slice(0, shown) + noise(Math.min(12, text.length - shown));
    await wait(ms);
  }
  el.textContent = text;
}

/* ── audio sintetizado ───────────────────────────────────── */
export const Sound = {
  ctx: null, on: true, ready: false, master: null, hum: null,

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(ctx.destination);

    // zumbido de sala de máquinas, muy por debajo
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 54;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    o.connect(this.hum).connect(this.master);
    o.start();
    this.hum.gain.setTargetAtTime(0.03, ctx.currentTime, 2.5);

    this.ready = true;
  },

  toggle() {
    this.on = !this.on;
    if (this.ready) this.master.gain.setTargetAtTime(this.on ? 0.42 : 0, this.ctx.currentTime, 0.12);
    return this.on;
  },

  blip(freq = 760, dur = 0.05, vol = 0.07, type = 'square') {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  tone(freq, dur = 0.42, vol = 0.12, when = 0) {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur - 0.06);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  buzz() {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.26);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.32);
  },

  fanfare() {
    if (!this.ready || !this.on) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 0.09, i * 0.1));
  },

  /** Aviso entrante: dos notas cortas. */
  ping() {
    if (!this.ready || !this.on) return;
    this.tone(880, 0.13, 0.07, 0);
    this.tone(1174, 0.18, 0.06, 0.13);
  },
};

/* ── avisos flotantes ────────────────────────────────────── */
export function notify(titulo, cuerpo, onClick) {
  const wrap = $('notes');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'note';
  el.setAttribute('role', 'status');
  el.innerHTML = `<p class="nt"></p><p class="nb"></p>`;
  el.querySelector('.nt').textContent = titulo;
  el.querySelector('.nb').textContent = cuerpo;

  const kill = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  };
  el.addEventListener('click', () => { onClick?.(); kill(); });
  wrap.appendChild(el);
  Sound.ping();
  setTimeout(kill, 9000);
  return el;
}

/* ── gestor de ventanas ──────────────────────────────────── */
const wins = new Map();
let zTop = 10;
let cascade = 0;
let onWinsChange = null;

export function setWinsListener(fn) { onWinsChange = fn; }
function changed() { onWinsChange?.([...wins.values()].map((w) => ({ id: w.id, title: w.title, mini: w.mini, focused: w.root.classList.contains('focused') }))); }

function focusWin(id) {
  const w = wins.get(id);
  if (!w) return;
  zTop += 1;
  w.root.style.zIndex = zTop;
  for (const [, o] of wins) o.root.classList.toggle('focused', o === w);
  changed();
}

function makeDraggable(root, handle, id) {
  if (isPhone()) return;
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.win-btn')) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    ox = root.offsetLeft; oy = root.offsetTop;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const layer = root.parentElement.getBoundingClientRect();
    // siempre queda un trozo de barra a la vista para poder recuperarla
    root.style.left = clamp(ox + e.clientX - sx, -root.offsetWidth + 96, layer.width - 64) + 'px';
    root.style.top = clamp(oy + e.clientY - sy, 0, layer.height - 34) + 'px';
  });
  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

function makeResizable(root, grip) {
  if (isPhone()) return;
  let sx = 0, sy = 0, ow = 0, oh = 0, sizing = false;
  grip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    sizing = true;
    sx = e.clientX; sy = e.clientY;
    ow = root.offsetWidth; oh = root.offsetHeight;
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove', (e) => {
    if (!sizing) return;
    root.style.width = Math.max(280, ow + e.clientX - sx) + 'px';
    root.style.height = Math.max(160, oh + e.clientY - sy) + 'px';
  });
  const stop = (e) => {
    if (!sizing) return;
    sizing = false;
    try { grip.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('pointercancel', stop);
}

export const Win = {
  open({ id, title, w = 520, h = 380, cls = '', onClose = null }) {
    const found = wins.get(id);
    if (found) {
      if (found.mini) this.restore(id); else focusWin(id);
      return found;
    }

    const layer = $('winlayer');
    const root = document.createElement('section');
    root.className = 'win ' + cls;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', title);

    const bar = document.createElement('header');
    bar.className = 'win-bar';
    bar.innerHTML = `<span class="win-t"></span>
      <button class="win-btn win-m" type="button" aria-label="Minimizar">–</button>
      <button class="win-btn win-x" type="button" aria-label="Cerrar">×</button>`;
    bar.querySelector('.win-t').textContent = title;

    const body = document.createElement('div');
    body.className = 'win-body';

    const grip = document.createElement('div');
    grip.className = 'win-rz';

    root.append(bar, body, grip);

    if (!isPhone()) {
      const lw = layer.clientWidth, lh = layer.clientHeight;
      const width = Math.min(w, lw - 24);
      const height = Math.min(h, lh - 24);
      root.style.width = width + 'px';
      root.style.height = height + 'px';
      const off = (cascade++ % 7) * 24;
      root.style.left = clamp(Math.round((lw - width) / 2) + off - 72, 8, Math.max(8, lw - width - 8)) + 'px';
      root.style.top = clamp(Math.round((lh - height) / 2) + off - 64, 8, Math.max(8, lh - height - 8)) + 'px';
    }

    layer.appendChild(root);
    const rec = { root, body, id, title, mini: false, _onClose: onClose, close: () => Win.close(id) };
    wins.set(id, rec);
    focusWin(id);

    bar.querySelector('.win-x').addEventListener('click', () => Win.close(id));
    bar.querySelector('.win-m').addEventListener('click', () => Win.minimize(id));
    root.addEventListener('pointerdown', () => { if (!rec.mini) focusWin(id); });
    makeDraggable(root, bar, id);
    makeResizable(root, grip);

    Sound.blip(760, 0.04, 0.05);
    return rec;
  },

  close(id) {
    const w = wins.get(id);
    if (!w) return;
    w._onClose?.();
    w.root.classList.add('closing');
    setTimeout(() => w.root.remove(), 170);
    wins.delete(id);
    Sound.blip(400, 0.05, 0.05);
    changed();
  },

  minimize(id) {
    const w = wins.get(id);
    if (!w || w.mini) return;
    w.mini = true;
    w.root.classList.add('mini');
    setTimeout(() => { if (w.mini) w.root.style.display = 'none'; }, 190);
    Sound.blip(340, 0.05, 0.05);
    changed();
  },

  restore(id) {
    const w = wins.get(id);
    if (!w) return;
    w.mini = false;
    w.root.style.display = '';
    w.root.classList.remove('mini');
    focusWin(id);
    Sound.blip(700, 0.04, 0.05);
  },

  toggle(id) {
    const w = wins.get(id);
    if (!w) return;
    if (w.mini) this.restore(id);
    else if (w.root.classList.contains('focused')) this.minimize(id);
    else focusWin(id);
  },

  isOpen: (id) => wins.has(id),
  get: (id) => wins.get(id),
  list: () => [...wins.values()],
};
