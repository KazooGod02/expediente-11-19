/* ════════════════════════════════════════════════════════════
   core.js — utilidades, audio y gestor de ventanas
   ════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   ⚠️ LOGO ASCII — sustituye este bloque por tu K.
   Cualquier generador de "ASCII art" sirve; pega el resultado
   entre las comillas y respeta los saltos de línea.
   ───────────────────────────────────────────────────────────── */
export const ASCII_K = String.raw`
   ██╗  ██╗
   ██║ ██╔╝
   █████╔╝
   ██╔═██╗
   ██║  ██╗
   ╚═╝  ╚═╝
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

export const store = {
  get(k, d = null) {
    try { const v = localStorage.getItem('oic.' + k); return v === null ? d : JSON.parse(v); }
    catch { return d; }
  },
  set(k, v) { try { localStorage.setItem('oic.' + k, JSON.stringify(v)); } catch { /* modo privado */ } },
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

/* ── audio sintetizado ───────────────────────────────────── */
export const Sound = {
  ctx: null, on: true, ready: false, master: null, hum: null,

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(ctx.destination);

    // zumbido de sala de máquinas, muy por debajo
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 52;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    o.connect(this.hum).connect(this.master);
    o.start();
    this.hum.gain.setTargetAtTime(0.035, ctx.currentTime, 2.5);

    this.ready = true;
  },

  toggle() {
    this.on = !this.on;
    if (this.ready) this.master.gain.setTargetAtTime(this.on ? 0.45 : 0, this.ctx.currentTime, 0.12);
    return this.on;
  },

  /** Pitido corto. Se usa para teclas, aperturas y avisos. */
  blip(freq = 760, dur = 0.05, vol = 0.08, type = 'square') {
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

  /** Tono sostenido con envolvente suave: el minijuego de secuencia. */
  tone(freq, dur = 0.42, vol = 0.13, when = 0) {
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

  /** Ruido corto de error. */
  buzz() {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.3);
  },

  /** Acorde ascendente de logro. */
  fanfare() {
    if (!this.ready || !this.on) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 0.1, i * 0.11));
  },
};

/* ── gestor de ventanas ──────────────────────────────────── */
const open = new Map();
let zTop = 10;
let cascade = 0;

function focusWin(id) {
  const w = open.get(id);
  if (!w) return;
  zTop += 1;
  w.root.style.zIndex = zTop;
  for (const [, other] of open) other.root.classList.toggle('focused', other === w);
}

function makeDraggable(root, handle) {
  if (isPhone()) return;
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.win-x')) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    ox = root.offsetLeft; oy = root.offsetTop;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const layer = root.parentElement.getBoundingClientRect();
    // se deja siempre un trozo de barra visible para poder recuperarla
    const nx = clamp(ox + e.clientX - sx, -root.offsetWidth + 90, layer.width - 60);
    const ny = clamp(oy + e.clientY - sy, 0, layer.height - 34);
    root.style.left = nx + 'px';
    root.style.top = ny + 'px';
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

export const Win = {
  /** Abre una ventana, o enfoca la que ya estuviera abierta con ese id. */
  open({ id, title, w = 520, h = 380, cls = '', onClose = null }) {
    if (open.has(id)) { focusWin(id); return open.get(id); }

    const layer = $('winlayer');
    const root = document.createElement('section');
    root.className = 'win ' + cls;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', title);

    const bar = document.createElement('header');
    bar.className = 'win-bar';
    const t = document.createElement('span');
    t.className = 'win-t';
    t.textContent = title;
    const x = document.createElement('button');
    x.className = 'win-x';
    x.type = 'button';
    x.setAttribute('aria-label', 'Cerrar ' + title);
    x.textContent = '×';
    bar.append(t, x);

    const body = document.createElement('div');
    body.className = 'win-body';

    root.append(bar, body);

    if (!isPhone()) {
      const lw = layer.clientWidth, lh = layer.clientHeight;
      const width = Math.min(w, lw - 24);
      const height = Math.min(h, lh - 24);
      root.style.width = width + 'px';
      root.style.height = height + 'px';
      const off = (cascade++ % 6) * 26;
      root.style.left = clamp(Math.round((lw - width) / 2) + off - 60, 8, Math.max(8, lw - width - 8)) + 'px';
      root.style.top = clamp(Math.round((lh - height) / 2) + off - 60, 8, Math.max(8, lh - height - 8)) + 'px';
    }

    layer.appendChild(root);
    const rec = { root, body, id, close: () => Win.close(id) };
    open.set(id, rec);
    focusWin(id);

    x.addEventListener('click', () => Win.close(id));
    root.addEventListener('pointerdown', () => focusWin(id));
    makeDraggable(root, bar);
    rec._onClose = onClose;

    Sound.blip(880, 0.04, 0.05);
    return rec;
  },

  close(id) {
    const w = open.get(id);
    if (!w) return;
    w._onClose?.();
    w.root.remove();
    open.delete(id);
    Sound.blip(420, 0.05, 0.05);
  },

  isOpen: (id) => open.has(id),
  get(id) { return open.get(id); },
  closeAll() { for (const id of [...open.keys()]) this.close(id); },
};
