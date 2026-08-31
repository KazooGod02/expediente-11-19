/* ════════════════════════════════════════════════════════════
   106.19 FM — RECEPTOR DE CAMPO
   ════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN — edita solo este bloque
   ───────────────────────────────────────────────────────────── */
const CONFIG = {
  // Fecha y hora del maratón, en la HORA LOCAL de quien visita.
  target: { year: 2026, month: 11, day: 19, hour: 0, minute: 0 },

  // Desde cuándo se mide la barra de "espera consumida".
  waitStart: '2026-08-30T00:00:00Z',

  // Frecuencia secreta que abre los canales.
  secret: 106.19,
  tolerance: 0.03,

  // Segundos tras los que los canales se abren solos, para quien no juegue con el dial.
  autoUnlock: 60,

  // ⚠️ CAMBIA ESTOS ENLACES POR LOS TUYOS
  channels: [
    { name: 'TWITCH',  handle: '@kazoo', url: 'https://twitch.tv/kazoo' },
    { name: 'YOUTUBE', handle: '@kazoo', url: 'https://youtube.com/@kazoo' },
    { name: 'KICK',    handle: '@kazoo', url: 'https://kick.com/kazoo' },
    { name: 'TIKTOK',  handle: '@kazoo', url: 'https://tiktok.com/@kazoo' },
  ],

  // La frase que forman las 8 palabras NO se guarda aquí: solo su huella.
  // Así no se puede leer el final abriendo este archivo.
  masterHash: 'e0235b03e4eda23b219b910b951fb3ee5296ce1ecd90022ec8b61fcd3b598ce8',
  claveLengths: [5, 4, 2, 7, 3, 6, 3, 8],
};

/* ─────────────────────────────────────────────────────────────
   utilidades
   ───────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  get(k, d = null) { try { const v = localStorage.getItem('leonida.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('leonida.' + k, JSON.stringify(v)); } catch { /* modo privado */ } },
};

function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const GLYPHS = '▚▞▛▟█▓▒░ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\|<>#@$%&*+=~';
const noise = (n) => Array.from({ length: n }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');

function toast(msg, ms = 2600) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('on'), ms);
}

function shake() {
  if (REDUCED) return;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 450);
}

/* ─────────────────────────────────────────────────────────────
   audio — todo sintetizado, cero archivos
   ───────────────────────────────────────────────────────────── */
const Audio_ = {
  ctx: null, on: true, ready: false,
  master: null, staticGain: null, toneGain: null, subGain: null,

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    // estática de radio: ruido blanco a través de un pasabanda
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6;
    this.staticGain = ctx.createGain();
    this.staticGain.gain.value = 0.18;
    src.connect(bp).connect(this.staticGain).connect(this.master);
    src.start();

    // pulso grave: la tensión de fondo
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = 47;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.0;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.22;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.05;
    lfo.connect(lfoAmt).connect(this.subGain.gain);
    sub.connect(this.subGain).connect(this.master);
    sub.start(); lfo.start();
    this.subGain.gain.setTargetAtTime(0.06, ctx.currentTime, 2);

    // canal para tonos (morse / estación de números)
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0.0;
    this.toneGain.connect(this.master);

    this.ready = true;
  },

  setStatic(v) {
    if (!this.ready) return;
    this.staticGain.gain.setTargetAtTime(this.on ? v : 0, this.ctx.currentTime, 0.08);
  },

  toggle() {
    this.on = !this.on;
    if (this.ready) this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, this.ctx.currentTime, 0.15);
    return this.on;
  },

  blip(freq = 880, dur = 0.05, vol = 0.09) {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  /** Emite una palabra en código morse. */
  morse(text, freq = 700, unit = 0.075) {
    if (!this.ready || !this.on) return 0;
    const TABLE = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
      I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
      Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
      Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
      5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    };
    let t = this.ctx.currentTime + 0.15;
    for (const ch of norm(text)) {
      if (ch === ' ') { t += unit * 4; continue; }
      const code = TABLE[ch];
      if (!code) continue;
      for (const sym of code) {
        const dur = (sym === '.' ? 1 : 3) * unit;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.13, t + 0.008);
        g.gain.setValueAtTime(0.13, t + dur - 0.01);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g).connect(this.master);
        o.start(t); o.stop(t + dur + 0.01);
        t += dur + unit;
      }
      t += unit * 2;
    }
    return t - this.ctx.currentTime;
  },
};

/* ─────────────────────────────────────────────────────────────
   cuenta regresiva
   ───────────────────────────────────────────────────────────── */
const T = CONFIG.target;
const TARGET = new Date(T.year, T.month - 1, T.day, T.hour, T.minute, 0, 0);
const WAIT_START = new Date(CONFIG.waitStart);

let clockDone = false;

function tickClock() {
  const now = Date.now();
  let ms = TARGET.getTime() - now;

  if (ms <= 0) {
    if (!clockDone) {
      clockDone = true;
      $('clock').classList.add('done');
      Term.print('*** LA SEÑAL ESTÁ ABIERTA. 19.11.2026. ***', 't-cmd');
    }
    $('cD').textContent = '000'; $('cH').textContent = '00';
    $('cM').textContent = '00'; $('cS').textContent = '00';
    $('decayFill').style.width = '100%';
    $('decayPct').textContent = '100.00%';
    return;
  }

  const s = Math.floor(ms / 1000);
  $('cD').textContent = pad(Math.floor(s / 86400), 3);
  $('cH').textContent = pad(Math.floor(s / 3600) % 24);
  $('cM').textContent = pad(Math.floor(s / 60) % 60);
  $('cS').textContent = pad(s % 60);

  const total = TARGET.getTime() - WAIT_START.getTime();
  const pct = clamp(((now - WAIT_START.getTime()) / total) * 100, 0, 100);
  $('decayFill').style.width = pct.toFixed(3) + '%';
  $('decayPct').textContent = pct.toFixed(2) + '%';
}

/* título de pestaña que se degrada */
let titleFlip = false;
setInterval(() => {
  const ms = TARGET.getTime() - Date.now();
  const days = Math.max(0, Math.floor(ms / 86400000));
  titleFlip = !titleFlip;
  document.title = titleFlip ? '106.19 FM — SEÑAL NO IDENTIFICADA' : `${pad(days, 3)} DÍAS — 19.11.2026`;
}, 4000);

/* ─────────────────────────────────────────────────────────────
   expediente cifrado
   ───────────────────────────────────────────────────────────── */
const Vault = {
  manifest: null,
  keys: {},
  open: new Map(),   // id -> { codename, body, clave }
  offline: false,

  async load() {
    const bust = '?v=' + Math.floor(Date.now() / 600000);
    try {
      const [m, k] = await Promise.all([
        fetch('data/fragments.json' + bust).then((r) => r.json()),
        fetch('data/keys.json' + bust).then((r) => (r.ok ? r.json() : { keys: {} })).catch(() => ({ keys: {} })),
      ]);
      this.manifest = m;
      this.keys = k.keys || {};
    } catch {
      this.offline = true;
      return false;
    }

    for (const f of this.manifest.fragments) {
      const kb = this.keys[f.id];
      if (!kb) continue;
      if (new Date(f.unlockAt).getTime() > Date.now()) continue; // aún no toca
      try {
        const key = await crypto.subtle.importKey('raw', b64(kb), 'AES-GCM', false, ['decrypt']);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(f.iv) }, key, b64(f.ct));
        this.open.set(f.id, JSON.parse(new TextDecoder().decode(pt)));
      } catch {
        /* llave inválida: queda cifrado */
      }
    }
    return true;
  },

  get total() { return this.manifest ? this.manifest.fragments.length : 8; },
  get next() {
    if (!this.manifest) return null;
    return this.manifest.fragments
      .filter((f) => !this.open.has(f.id))
      .sort((a, b) => new Date(a.unlockAt) - new Date(b.unlockAt))[0] || null;
  },
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

let scrambleTimers = [];

function renderVault() {
  const list = $('frags');
  scrambleTimers.forEach(clearInterval);
  scrambleTimers = [];
  list.innerHTML = '';

  if (Vault.offline) {
    list.innerHTML = '<li style="color:var(--amber);font-size:.7rem;letter-spacing:.14em;padding:.6rem 0">' +
      'RECEPTOR SIN ENLACE — abre la página desde un servidor, no con doble clic.</li>';
    return;
  }

  const seen = new Set(store.get('seen', []));

  for (const f of Vault.manifest.fragments) {
    const data = Vault.open.get(f.id);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frag';
    btn.dataset.open = data ? 'true' : 'false';
    btn.dataset.id = f.id;

    const due = new Date(f.unlockAt).getTime() <= Date.now();
    const name = data ? data.codename : (due ? 'DESCIFRADO PENDIENTE' : noise(18));
    const st = data ? 'ABIERTO' : (due ? 'EN COLA' : 'CIFRADO');

    btn.innerHTML =
      `<span class="n">${pad(f.id)}</span>` +
      `<span class="name"></span>` +
      `<span class="st">${st}</span>`;
    btn.querySelector('.name').textContent = name;

    if (data) {
      btn.setAttribute('aria-label', `Fragmento ${f.id}: ${data.codename}`);
      btn.addEventListener('click', () => openFragment(f.id));
      if (!seen.has(f.id)) btn.classList.add('fresh');
    } else {
      btn.disabled = true;
      btn.title = due ? 'La llave aún no se ha publicado.' : 'Se descifra el ' + fmtDate(f.unlockAt);
      if (!due) {
        // el texto cifrado se revuelve, nunca se queda quieto
        scrambleTimers.push(setInterval(() => {
          const el = btn.querySelector('.name');
          if (el) el.textContent = noise(18);
        }, 900 + f.id * 130));
      }
    }
    li.appendChild(btn);
    list.appendChild(li);
  }

  $('expCount').textContent = `${Vault.open.size}/${Vault.total} DESCIFRADOS`;

  const nx = Vault.next;
  $('fragNext').innerHTML = nx
    ? `PRÓXIMO DESCIFRADO · <b>${fmtDate(nx.unlockAt)}</b>`
    : 'EXPEDIENTE COMPLETO.';

  // clave maestra: cada palabra sale del fragmento que la contiene
  $('claveCount').textContent = `${Vault.open.size}/${Vault.total}`;
  $('claveWords').innerHTML = Vault.manifest.fragments
    .map((f, i) => {
      const d = Vault.open.get(f.id);
      if (d) return `<b>${d.clave}</b>`;
      return `<i>${'·'.repeat(CONFIG.claveLengths[i] || 4)}</i>`;
    })
    .join(' ');
}

async function openFragment(id) {
  const data = Vault.open.get(id);
  if (!data) return;

  const seen = new Set(store.get('seen', []));
  seen.add(id);
  store.set('seen', [...seen]);
  document.querySelector(`.frag[data-id="${id}"]`)?.classList.remove('fresh');

  $('modalKicker').textContent = `FRAGMENTO ${pad(id)} · DESCIFRADO`;
  $('modalTitle').textContent = data.codename;
  $('modalClave').innerHTML = `CLAVE ${pad(id)}/${pad(Vault.total)} · <b>${data.clave}</b>`;
  const body = $('modalBody');
  body.innerHTML = '';
  $('modal').hidden = false;
  $('modalX').focus();
  Audio_.blip(1200, 0.06);

  // el texto se resuelve desde el ruido, línea por línea
  for (const line of data.body) {
    const p = document.createElement('p');
    body.appendChild(p);
    if (REDUCED) { p.textContent = line; continue; }
    const steps = 7;
    for (let s = 0; s <= steps; s++) {
      const shown = Math.floor((line.length * s) / steps);
      p.textContent = line.slice(0, shown) + noise(Math.min(14, line.length - shown));
      await wait(28);
    }
    p.textContent = line;
    Audio_.blip(560 + Math.random() * 300, 0.03, 0.05);
    await wait(70);
  }
}

function closeModal() { $('modal').hidden = true; }

/* ─────────────────────────────────────────────────────────────
   dial + onda
   ───────────────────────────────────────────────────────────── */
const Dial = {
  freq: 92.4,
  locked: false,
  cv: null, cx: null, phase: 0,
  last: 0, visible: true,

  init() {
    this.cv = $('wave');
    this.cx = this.cv.getContext('2d');
    const input = $('dialInput');

    const marks = [88, 96, 104, 112, 120];
    $('dialScale').innerHTML = marks.map((m) => `<span>${m}</span>`).join('');

    input.addEventListener('input', () => this.set(parseFloat(input.value)));
    this.set(this.freq);
    this.resize();
    addEventListener('resize', () => this.resize());
    // no gastar batería dibujando una onda que nadie está mirando
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; })
        .observe(document.querySelector('.dial'));
    }
    requestAnimationFrame((t) => this.draw(t));
  },

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.cv.width = this.cv.clientWidth * dpr;
    this.cv.height = 90 * dpr;
    this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  /** 0 = lejísimos, 1 = encima de la frecuencia */
  get prox() {
    const d = Math.abs(this.freq - CONFIG.secret);
    return clamp(1 - d / 2.2, 0, 1);
  },

  set(f) {
    // una vez enganchada la portadora, el receptor ya no la suelta
    if (this.locked) {
      f = CONFIG.secret;
      $('dialInput').value = f;
    }
    this.freq = f;
    $('dialRead').innerHTML = `${f.toFixed(2)} <em>MHz</em>`;
    $('barFreq').textContent = `${f.toFixed(2)} FM`;

    const p = this.prox;
    Audio_.setStatic(0.03 + (1 - p) * 0.17);

    const bars = Math.round(p * 5);
    $('meters').innerHTML = Array.from({ length: 5 },
      (_, i) => `<i class="${i < bars ? 'on' : ''}" style="height:${5 + i * 2}px"></i>`).join('');
    $('barSig').textContent = bars === 0 ? '—' : `${bars * 20}%`;

    const hint = $('dialHint');
    if (p > 0.995) hint.textContent = 'señal bloqueada';
    else if (p > 0.96) hint.textContent = '·· casi ··';
    else if (p > 0.85) hint.textContent = 'hay algo aquí';
    else if (p > 0.6) hint.textContent = 'el ruido cambia';
    else hint.textContent = 'arrastra · ← → · algo hay cerca';

    if (!this.locked && Math.abs(f - CONFIG.secret) <= CONFIG.tolerance) this.lock();
  },

  lock() {
    this.locked = true;
    $('dialInput').value = CONFIG.secret;
    this.freq = CONFIG.secret;
    $('dialRead').innerHTML = `${CONFIG.secret.toFixed(2)} <em>MHz</em>`;
    document.querySelector('.dial').classList.add('locked');
    $('dialHint').textContent = 'señal bloqueada';
    Audio_.setStatic(0.015);
    shake();

    const d = document.querySelector('.hero-date');
    d.classList.add('glitch');
    setTimeout(() => d.classList.remove('glitch'), 400);

    Term.print('', 't-dim');
    Term.print('>> PORTADORA LOCALIZADA EN 106.19 MHz', 't-ok');
    Term.print('>> IDENTIFICADOR EN MORSE: L E O N I D A', 't-ok');
    Audio_.morse('LEONIDA');
    openChannels('SINTONIZACIÓN MANUAL');
    store.set('tuned', true);
  },

  draw(ts = 0) {
    requestAnimationFrame((t) => this.draw(t));

    // ~30 fps, y nada mientras la pestaña o el dial estén fuera de vista
    if (ts - this.last < 32) return;
    this.last = ts;
    if (document.hidden || !this.visible) return;

    const { cx, cv } = this;
    const w = cv.clientWidth, h = 90;
    cx.clearRect(0, 0, w, h);
    const p = this.prox;
    this.phase += 0.09 + p * 0.14;

    // eje
    cx.lineWidth = 1;
    cx.strokeStyle = 'rgba(126,134,158,.14)';
    cx.beginPath(); cx.moveTo(0, h / 2); cx.lineTo(w, h / 2); cx.stroke();

    // la onda pasa de ruido puro a portadora limpia.
    // el resplandor son dos trazos superpuestos, no shadowBlur: cuesta una fracción
    const pts = [];
    for (let x = 0; x <= w; x += 2) {
      const carrier = Math.sin(x * 0.055 + this.phase) * (h * 0.3) * (0.25 + p * 0.75);
      const chaos = (Math.random() - 0.5) * (h * 0.62) * (1 - p) ** 1.6;
      pts.push([x, h / 2 + carrier + chaos]);
    }
    const trace = () => {
      cx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        i ? cx.lineTo(x, y) : cx.moveTo(x, y);
      }
      cx.stroke();
    };
    const hue = this.locked ? '255,46,136' : '33,230,255';
    cx.lineWidth = 3.5;
    cx.strokeStyle = `rgba(${hue},${0.10 + p * 0.16})`;
    trace();
    cx.lineWidth = 1.2;
    cx.strokeStyle = `rgba(${hue},${this.locked ? 1 : 0.4 + p * 0.5})`;
    trace();
  },
};

/* ─────────────────────────────────────────────────────────────
   canales
   ───────────────────────────────────────────────────────────── */
let channelsOpen = false;

function openChannels(reason) {
  if (channelsOpen) return;
  channelsOpen = true;
  clearInterval(openChannels._t);

  $('chanLocked').hidden = true;
  $('chanState').textContent = 'ABIERTO · ' + reason;
  const grid = $('chanGrid');
  grid.hidden = false;
  grid.innerHTML = CONFIG.channels.map((c) =>
    `<a class="chan-link" href="${c.url}" target="_blank" rel="noopener noreferrer">
       <b>${c.name}</b><span>${c.handle}</span>
     </a>`).join('');

  Term.print('>> CANALES DE EMISIÓN ABIERTOS', 't-ok');
  $('chan').dataset.open = 'true';
  Audio_.blip(1400, 0.09, 0.1);
}

function startAutoUnlock() {
  let left = CONFIG.autoUnlock;
  const span = $('chanAuto').querySelector('span');
  openChannels._t = setInterval(() => {
    left -= 1;
    if (span) span.textContent = left;
    if (left <= 0) openChannels('DESBLOQUEO AUTOMÁTICO');
  }, 1000);
}

/* ─────────────────────────────────────────────────────────────
   operativo
   ───────────────────────────────────────────────────────────── */
function operative() {
  let op = store.get('op');
  if (!op) {
    const L = 'ABCDEFGHJKLMNPRSTVWXZ';
    op = {
      id: L[(Math.random() * L.length) | 0] + ((Math.random() * 9) | 0) + '-' +
          pad(((Math.random() * 9999) | 0), 4),
      since: new Date().toISOString(),
    };
    store.set('op', op);
  }
  const since = new Date(op.since).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' });
  $('op').textContent = `OPERATIVO ${op.id} · INDUCIDO ${since}`;
  return op;
}

/* ─────────────────────────────────────────────────────────────
   consola
   ───────────────────────────────────────────────────────────── */
const Term = {
  el: null,
  queue: Promise.resolve(),

  init() { this.el = $('termOut'); },

  print(text = '', cls = 't-dim') {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    this.el.appendChild(p);
    this.el.scrollTop = this.el.scrollHeight;
    return p;
  },

  /** imprime con efecto de teletipo, en orden */
  type(lines, cls = 't-dim', speed = 12) {
    this.queue = this.queue.then(async () => {
      for (const line of [].concat(lines)) {
        const p = this.print('', cls);
        if (REDUCED) { p.textContent = line; continue; }
        for (let i = 0; i <= line.length; i++) {
          p.textContent = line.slice(0, i);
          this.el.scrollTop = this.el.scrollHeight;
          if (i % 3 === 0) await wait(speed);
        }
        await wait(40);
      }
    });
    return this.queue;
  },
};

const HELP = [
  'ESTADO        estado del receptor',
  'ARCHIVO <n>   abre un fragmento descifrado',
  'SINTONIZAR<f> mueve el dial a una frecuencia',
  'CANALES       dónde se transmite',
  'CLAVE <frase> introduce la clave maestra',
  'OPERATIVO     tu identificador',
  'AUDIO         silencia o reactiva',
  'LIMPIAR       borra la consola',
];

function command(raw) {
  const line = norm(raw);
  if (!line) return;
  Term.print('> ' + line, 't-cmd');
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ');
  Audio_.blip(520, 0.03, 0.05);

  switch (cmd) {
    case 'AYUDA': case 'HELP': case '?':
      Term.type(['COMANDOS DISPONIBLES:', ...HELP], 't-sys');
      break;

    case 'ESTADO': {
      const ms = TARGET.getTime() - Date.now();
      const days = Math.max(0, Math.floor(ms / 86400000));
      Term.type([
        `RECEPTOR ........ ${Dial.locked ? 'BLOQUEADO EN 106.19' : Dial.freq.toFixed(2) + ' MHz'}`,
        `EXPEDIENTE ...... ${Vault.open.size}/${Vault.total} descifrados`,
        `PRÓXIMA LLAVE ... ${Vault.next ? fmtDate(Vault.next.unlockAt) : 'ninguna'}`,
        `TRANSMISIÓN ..... en ${days} días`,
        `CANALES ......... ${channelsOpen ? 'abiertos' : 'clasificados'}`,
      ], 't-ok');
      break;
    }

    case 'ARCHIVO': case 'EXPEDIENTE': {
      const n = parseInt(arg, 10);
      if (!n) {
        Term.type(Vault.manifest
          ? Vault.manifest.fragments.map((f) => {
              const d = Vault.open.get(f.id);
              return `[${pad(f.id)}] ${d ? d.codename : '████████ cifrado hasta ' + fmtDate(f.unlockAt)}`;
            })
          : ['Sin enlace con el archivo.'], 't-sys');
      } else if (Vault.open.has(n)) {
        openFragment(n);
        Term.print('Abriendo fragmento ' + pad(n) + '...', 't-ok');
      } else {
        const f = Vault.manifest?.fragments.find((x) => x.id === n);
        Term.type(f
          ? [`FRAGMENTO ${pad(n)}: cifrado.`, `La llave se publica el ${fmtDate(f.unlockAt)}.`, 'No existe todavía. Ni aquí, ni en el repositorio, ni en ningún sitio.']
          : ['No hay ningún fragmento con ese número.'], 't-warn');
      }
      break;
    }

    case 'SINTONIZAR': case 'TUNE': {
      const f = parseFloat(arg.replace(',', '.'));
      if (isNaN(f) || f < 88 || f > 120) { Term.type(['Frecuencia fuera de banda. Válido: 88.00 – 120.00'], 't-warn'); break; }
      $('dialInput').value = f;
      Dial.set(f);
      Term.type([`Dial en ${f.toFixed(2)} MHz.`], 't-ok');
      break;
    }

    case 'CANALES':
      if (channelsOpen) { Term.type(CONFIG.channels.map((c) => `${c.name.padEnd(9)} ${c.url}`), 't-ok'); }
      else Term.type(['CLASIFICADO.', 'Sintoniza 106.19 para abrirlos.'], 't-warn');
      break;

    case 'CLAVE':
      if (!arg) { Term.type(['Uso: CLAVE <frase completa>'], 't-warn'); break; }
      checkClave(arg);
      break;

    case 'OPERATIVO': {
      const op = store.get('op');
      Term.type([`ID ......... ${op?.id || '—'}`, `INDUCIDO ... ${op ? fmtDate(op.since) : '—'}`], 't-ok');
      break;
    }

    case 'AUDIO':
      setAudio(Audio_.toggle());
      Term.type([`Audio ${Audio_.on ? 'activo' : 'silenciado'}.`], 't-ok');
      break;

    case 'LIMPIAR': case 'CLEAR':
      Term.el.innerHTML = '';
      break;

    /* ── ecos ── */
    case 'LEONIDA':
      Term.type(['No es un lugar. Es una fecha con costa.'], 't-cmd'); break;
    case 'VICE':
      Term.type(['Esa ciudad ya tuvo su noche. Esta es otra.'], 't-cmd'); break;
    case 'KAZOO':
      Term.type(['El que no va a dormir.'], 't-cmd'); break;
    case 'ROCKSTAR':
      Term.type(['No trabajamos para ellos.', 'Solo llevamos trece años esperándolos.'], 't-warn'); break;
    case 'SPOILER': case 'TRAMPA': case 'HACK':
      Term.type([
        'Adelante, inténtalo.',
        'Los fragmentos son AES-256-GCM.',
        'Sus llaves no están en este sitio ni en el repositorio:',
        'se publican solas, el día que toca.',
        'No hay nada que romper. Solo que esperar.',
      ], 't-warn');
      shake(); break;
    case '1911': case '19-11': case '19.11':
      Term.type(['19.11.2026 · 00:00 · tu hora local.'], 't-ok');
      Audio_.morse('19 11'); break;
    case 'QUIEN': case 'HOLA':
      Term.type(['Un receptor. Nada más.'], 't-dim'); break;

    default:
      Term.type([`Comando desconocido: ${cmd}`, 'Escribe AYUDA.'], 't-warn');
  }
}

/* ─────────────────────────────────────────────────────────────
   clave maestra — se comprueba contra una huella, no contra el texto
   ───────────────────────────────────────────────────────────── */
async function checkClave(arg) {
  const attempt = arg.replace(/\s+/g, ' ').trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(attempt));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (hex === CONFIG.masterHash) {
    Term.type(['··· CLAVE MAESTRA ACEPTADA ···', attempt, 'Nos vemos el 19.11.'], 't-ok');
    shake();
    Audio_.morse('19 11');
    openChannels('CLAVE MAESTRA');
    store.set('mastered', true);
  } else {
    Term.type(['Clave incorrecta.', `Recuperadas ${Vault.open.size} de ${Vault.total} palabras.`], 't-warn');
  }
}

/* ─────────────────────────────────────────────────────────────
   propagación
   ───────────────────────────────────────────────────────────── */
async function share() {
  const op = store.get('op');
  const days = Math.max(0, Math.ceil((TARGET.getTime() - Date.now()) / 86400000));
  const text =
    `106.19 FM — SEÑAL NO IDENTIFICADA\n` +
    `${Vault.open.size}/${Vault.total} fragmentos descifrados · faltan ${days} días\n` +
    `OPERATIVO ${op?.id || '—'}\n${location.href}`;
  try {
    if (navigator.share) { await navigator.share({ title: '106.19 FM', text, url: location.href }); return; }
    await navigator.clipboard.writeText(text);
    toast('SEÑAL COPIADA — PÉGALA DONDE HAGA FALTA');
  } catch {
    toast('NO SE PUDO COPIAR');
  }
  Audio_.blip(1000, 0.06);
}

/* ─────────────────────────────────────────────────────────────
   arranque
   ───────────────────────────────────────────────────────────── */
function setAudio(on) {
  const b = $('audioBtn');
  b.innerHTML = `AUDIO <b>${on ? 'ON' : 'OFF'}</b>`;
  b.setAttribute('aria-pressed', String(on));
}

async function boot() {
  document.body.dataset.phase = 'live';
  $('gate').classList.add('out');
  setTimeout(() => { $('gate').remove(); }, 800);

  $('app').hidden = false;
  requestAnimationFrame(() => $('app').classList.add('in'));

  Term.init();
  Dial.init();
  const op = operative();

  tickClock();
  setInterval(tickClock, 1000);

  await Term.type([
    'RECEPTOR DE CAMPO v1.19 — ENLACE ESTABLECIDO',
    `OPERATIVO ${op.id} REGISTRADO EN EL EXPEDIENTE`,
    'RECUPERANDO ARCHIVO CIFRADO...',
  ], 't-sys', 8);

  const ok = await Vault.load();
  renderVault();

  if (!ok) {
    Term.type(['ERROR: sin enlace con el archivo.', 'Sirve la página desde un servidor (no file://).'], 't-warn');
  } else {
    Term.type([
      `ARCHIVO: ${Vault.open.size} de ${Vault.total} fragmentos legibles.`,
      Vault.next ? `SIGUIENTE LLAVE: ${fmtDate(Vault.next.unlockAt)}` : 'EXPEDIENTE COMPLETO.',
      'Escribe AYUDA para ver los comandos.',
    ], 't-ok');
  }

  if (!store.get('tuned')) startAutoUnlock();
  else openChannels('OPERATIVO RECONOCIDO');

  // refresca el expediente cada 10 min por si se publicó una llave
  setInterval(async () => {
    const before = Vault.open.size;
    await Vault.load();
    if (Vault.open.size > before) {
      renderVault();
      shake();
      Term.print('>> NUEVA LLAVE PUBLICADA. FRAGMENTO DESCIFRADO.', 't-ok');
      Audio_.morse('NUEVO');
      toast('NUEVO FRAGMENTO DESCIFRADO');
    }
  }, 600000);
}

/* compuerta */
$('gateBtn').addEventListener('click', () => {
  Audio_.init();
  if (Audio_.ctx?.state === 'suspended') Audio_.ctx.resume();
  $('gateStatus').textContent = 'ENLAZANDO...';
  Audio_.setStatic(0.16);
  Audio_.blip(1600, 0.12, 0.12);
  setTimeout(boot, 420);
});

/* animación de la compuerta */
(() => {
  const el = $('gateStatus');
  const msgs = ['SEÑAL NO IDENTIFICADA', 'PORTADORA INESTABLE', 'ORIGEN DESCONOCIDO', 'TRANSMISIÓN EN CURSO'];
  let i = 0;
  setInterval(() => { if (el.isConnected) el.textContent = msgs[i++ % msgs.length]; }, 2800);
  const f = $('gateFreq');
  setInterval(() => {
    if (!f.isConnected || Math.random() > 0.25) return;
    f.textContent = (100 + Math.random() * 15).toFixed(2);
    setTimeout(() => { if (f.isConnected) f.textContent = '106.19'; }, 90);
  }, 1600);
})();

/* eventos */
function submitCommand() {
  const input = $('termInput');
  const v = input.value;
  input.value = '';
  command(v);
}
$('termForm').addEventListener('submit', (e) => { e.preventDefault(); submitCommand(); });
// el envío implícito del formulario no es fiable en todos los teclados
$('termInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitCommand(); }
});
$('audioBtn').addEventListener('click', () => setAudio(Audio_.toggle()));
$('shareBtn').addEventListener('click', share);
$('modalX').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && document.activeElement !== $('termInput') && !$('app').hidden) {
    e.preventDefault(); $('termInput').focus();
  }
});
