/* ════════════════════════════════════════════════════════════
   app.js — O.I.C. Terminal de campo
   ════════════════════════════════════════════════════════════ */
import { $, clamp, pad, wait, norm, noise, b64, store, toast, Sound, Win, REDUCED, ASCII_K } from './core.js';
import { openTriangulacion, openCaja, openSecuencia } from './games.js';
import { openPoster } from './poster.js';

/* ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN — edita solo este bloque
   ───────────────────────────────────────────────────────────── */
const CONFIG = {
  // Fecha de la transmisión, en la HORA LOCAL de quien visita.
  target: { year: 2026, month: 11, day: 19, hour: 0, minute: 0 },

  channels: [
    { name: 'TWITCH',  handle: '@kazoogod02', url: 'https://twitch.tv/kazoogod02' },
    { name: 'YOUTUBE', handle: '@kazoogod02', url: 'https://youtube.com/@kazoogod02' },
    { name: 'KICK',    handle: '@kazoogod02', url: 'https://kick.com/kazoogod02' },
    { name: 'TIKTOK',  handle: '@kazoogod02', url: 'https://tiktok.com/@kazoogod02' },
  ],

  // Lo que entrega cada ejercicio. Juntas forman la posición final.
  claves: {
    lat:  { label: 'LATITUD',  value: '25.7617',  from: 'TRIANGULACIÓN' },
    lon:  { label: 'LONGITUD', value: '-80.1918', from: 'CAJA 419' },
    hora: { label: 'HORA',     value: '00:00',    from: 'SECUENCIA' },
  },
};

const T = CONFIG.target;
const TARGET = new Date(T.year, T.month - 1, T.day, T.hour, T.minute, 0, 0);

/* ─────────────────────────────────────────────────────────────
   estado del agente
   ───────────────────────────────────────────────────────────── */
const State = {
  claves: new Set(store.get('claves', [])),
  seen: new Set(store.get('seen', [])),

  hasClave(id) { return this.claves.has(id); },
  get complete() { return Object.keys(CONFIG.claves).every((k) => this.claves.has(k)); },

  grantClave(id) {
    if (this.claves.has(id)) return;
    this.claves.add(id);
    store.set('claves', [...this.claves]);
    refreshStatus();
    refreshIcons();
    toast(`CLAVE OBTENIDA · ${CONFIG.claves[id].label}`);
    Term.print(`>> CLAVE REGISTRADA: ${CONFIG.claves[id].label} = ${CONFIG.claves[id].value}`, 't-ok');
    if (this.complete) {
      Term.print('>> LAS TRES LECTURAS ESTÁN EN SU PODER. ESCRIBA TRIANGULAR FINAL.', 't-ok');
      toast('TRIANGULACIÓN DISPONIBLE');
    }
  },
};

const ctxForGames = {
  claves: CONFIG.claves,
  hasClave: (id) => State.hasClave(id),
  grantClave: (id) => State.grantClave(id),
};

/* ─────────────────────────────────────────────────────────────
   expediente cifrado
   ───────────────────────────────────────────────────────────── */
const Vault = {
  manifest: null, keys: {}, open: new Map(), offline: false,

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
      if (!kb || new Date(f.unlockAt).getTime() > Date.now()) continue;
      try {
        const key = await crypto.subtle.importKey('raw', b64(kb), 'AES-GCM', false, ['decrypt']);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(f.iv) }, key, b64(f.ct));
        this.open.set(f.id, JSON.parse(new TextDecoder().decode(pt)));
      } catch { /* llave inválida: sigue cifrado */ }
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

const fmtDate = (iso) => new Date(iso).toLocaleString('es', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/* ─────────────────────────────────────────────────────────────
   consola
   ───────────────────────────────────────────────────────────── */
const Term = {
  out: null, queue: Promise.resolve(),

  print(text = '', cls = 't-dim') {
    if (!this.out) return null;
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    this.out.appendChild(p);
    this.out.scrollTop = this.out.scrollHeight;
    return p;
  },

  art(text) {
    if (!this.out) return;
    const pre = document.createElement('pre');
    pre.textContent = text;
    this.out.appendChild(pre);
    this.out.scrollTop = this.out.scrollHeight;
  },

  type(lines, cls = 't-dim', speed = 10) {
    this.queue = this.queue.then(async () => {
      for (const line of [].concat(lines)) {
        const p = this.print('', cls);
        if (!p) return;
        if (REDUCED) { p.textContent = line; continue; }
        for (let i = 0; i <= line.length; i++) {
          p.textContent = line.slice(0, i);
          this.out.scrollTop = this.out.scrollHeight;
          if (i % 3 === 0) await wait(speed);
        }
        await wait(30);
      }
    });
    return this.queue;
  },
};

const HELP = [
  'EXPEDIENTE     abre el caso 11-19',
  'HERRAMIENTAS   utilidades autorizadas',
  'CARTEL         generador de carteles de búsqueda',
  'CLAVES         lecturas en su poder',
  'AGENTE         su credencial',
  'ESTADO         situación del caso',
  'CANALES        contacto de la unidad',
  'LIMPIAR        vacía la consola',
];

function openConsole() {
  const win = Win.open({ id: 'term', title: 'CONSOLA — terminal de campo', w: 620, h: 460, cls: 'term-win' });
  if (win.body.dataset.built) { win.body.parentElement.querySelector('.term-in input')?.focus(); return; }
  win.body.dataset.built = '1';

  const log = document.createElement('div');
  log.className = 'term';
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  win.body.appendChild(log);
  Term.out = log;

  const form = document.createElement('form');
  form.className = 'term-in';
  form.autocomplete = 'off';
  form.innerHTML = `<span class="pr">&gt;</span>
    <label class="sr-only" for="termIn">Comando</label>
    <input id="termIn" type="text" spellcheck="false" placeholder="AYUDA">`;
  win.root.appendChild(form);

  const input = form.querySelector('input');
  const submit = () => { const v = input.value; input.value = ''; command(v); };
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  // el envío implícito del formulario no es fiable en todos los teclados
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  Term.art(ASCII_K);
  Term.type([
    'TERMINAL DE CAMPO O.I.C. · v11.19',
    `CREDENCIAL ${agent().id} VERIFICADA`,
    'Escriba AYUDA para ver los comandos autorizados.',
  ], 't-sys', 7);

  setTimeout(() => input.focus(), 120);
}

function command(raw) {
  const line = norm(raw);
  if (!line) return;
  Term.print('> ' + line, 't-cmd');
  Sound.blip(520, 0.03, 0.05);

  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');

  switch (cmd) {
    case 'AYUDA': case 'HELP': case '?':
      Term.type(['COMANDOS AUTORIZADOS:', ...HELP,
        '', 'Este terminal acepta más órdenes de las que muestra.'], 't-sys');
      break;

    case 'EXPEDIENTE': case 'CASO':
      openExpediente();
      Term.print('Abriendo expediente 11-19...', 't-ok');
      break;

    case 'HERRAMIENTAS': case 'UTILIDADES':
      Term.type([
        'UTILIDADES DE CAMPO AUTORIZADAS:',
        '  TRIANGULAR    localización por distancias',
        '  CARTEL        generador de carteles de búsqueda',
        '',
        'Hay dos simuladores más en este equipo que no figuran en el índice.',
        'El expediente dice dónde. Léalo entero.',
      ], 't-ok');
      break;

    case 'TRIANGULAR':
      if (arg === 'FINAL' || arg === 'POSICION') { openFinal(); break; }
      openTriangulacion(ctxForGames);
      Term.print('Cargando ejercicio de triangulación...', 't-ok');
      break;

    case 'CAJA':
      if (arg && arg !== '419') { Term.type(['No hay ninguna caja con ese número en el inventario.'], 't-warn'); break; }
      openCaja(ctxForGames);
      Term.print('Cargando simulador de cerradura...', 't-ok');
      break;

    case 'SECUENCIA': case 'TONOS':
      openSecuencia(ctxForGames);
      Term.print('Cargando reproductor de secuencia...', 't-ok');
      break;

    case 'CARTEL': case 'WANTED': case 'BUSCA':
      openPoster(ctxForGames);
      Term.print('Abriendo generador de carteles...', 't-ok');
      break;

    case 'CLAVES': {
      const rows = Object.entries(CONFIG.claves).map(([k, c]) =>
        `  ${c.label.padEnd(9)} ${State.hasClave(k) ? c.value : '— pendiente (' + c.from + ')'}`);
      Term.type(['LECTURAS EN SU PODER:', ...rows,
        State.complete ? '' : '', State.complete ? 'Complete. Escriba TRIANGULAR FINAL.' : ''
      ].filter((x) => x !== ''), State.complete ? 't-ok' : 't-sys');
      break;
    }

    case 'TRIANGULACION':
      openFinal();
      break;

    case 'AGENTE': case 'CREDENCIAL': {
      const a = agent();
      Term.type([`IDENTIFICADOR .. ${a.id}`, `ALTA ........... ${fmtDate(a.since)}`,
        `CLAVES ......... ${State.claves.size}/3`], 't-ok');
      break;
    }

    case 'ESTADO': {
      const ms = TARGET.getTime() - Date.now();
      const d = Math.max(0, Math.floor(ms / 86400000));
      Term.type([
        `CASO ........... 11-19 (abierto)`,
        `EXPEDIENTE ..... ${Vault.open.size}/${Vault.total} partes desclasificadas`,
        `SIGUIENTE ...... ${Vault.next ? fmtDate(Vault.next.unlockAt) : 'ninguna'}`,
        `CLAVES ......... ${State.claves.size}/3`,
        `PLAZO .......... ${d} días`,
      ], 't-ok');
      break;
    }

    case 'CANALES': case 'CONTACTO':
      openCanales();
      Term.print('Abriendo canales de la unidad...', 't-ok');
      break;

    case 'TRANSMISION': case 'TRANSMISIÓN':
      openFinal();
      break;

    case 'LIMPIAR': case 'CLEAR':
      Term.out.innerHTML = '';
      break;

    case 'K':
      Term.art(ASCII_K);
      Term.type(['Marca registrada en el expediente. No sabemos qué significa.'], 't-dim');
      break;

    /* ── órdenes que no figuran en el índice ── */
    case 'KAZOO':
      Term.type(['El que mira las cámaras de frente.', 'Duerme poco. Nunca la noche que importa.'], 't-cmd'); break;
    case 'CORVO':
      Term.type(['El que no baja del coche.', 'Once años esperando a que alguien le diera una dirección.'], 't-cmd'); break;
    case 'NUEVE':
      Term.type(['No hay fotografías. No hay huellas. No hay voz.', 'Sólo una caja abierta desde dentro.'], 't-cmd'); break;
    case '419':
      Term.type(['Caja 419. Alquilada durante once años. Abierta una vez.',
        'Si quiere ver la cerradura, escriba CAJA 419.'], 't-warn'); break;
    case 'MERIDIANO': case 'BANCO':
      Term.type(['Sucursal 7. Cuatro minutos. Cero disparos.', 'Nadie ha denunciado el robo. Piense en eso.'], 't-warn'); break;
    case 'SPOILER': case 'TRAMPA': case 'HACK':
      Term.type([
        'Adelante, agente.',
        'Las partes del expediente van en AES-256-GCM.',
        'Sus llaves no están en este equipo ni en el servidor:',
        'se publican solas, el día que les toca.',
        'No hay nada que forzar. Sólo que esperar.',
      ], 't-warn');
      Sound.buzz(); break;
    case 'OIC': case 'OFICINA':
      Term.type(['Oficina de Investigación Criminal.', 'División de Casos Abiertos.',
        'Fundada para cerrar lo que nadie quiso cerrar.'], 't-dim'); break;

    default:
      Term.type([`Orden no reconocida: ${cmd}`, 'Escriba AYUDA.'], 't-warn');
  }
}

/* ─────────────────────────────────────────────────────────────
   expediente
   ───────────────────────────────────────────────────────────── */
let scrambleTimers = [];

function openExpediente() {
  const win = Win.open({ id: 'exp', title: 'EXPEDIENTE 11-19 — partes desclasificadas', w: 520, h: 430 });
  renderExpediente(win.body);
}

function renderExpediente(body) {
  scrambleTimers.forEach(clearInterval);
  scrambleTimers = [];
  body.innerHTML = '';

  if (Vault.offline) {
    body.innerHTML = `<p class="t-warn" style="font-size:.7rem">SIN ENLACE CON EL ARCHIVO.
      Sirva la página desde un servidor, no con doble clic.</p>`;
    return;
  }
  if (!Vault.manifest) {
    body.innerHTML = `<p class="t-dim" style="font-size:.7rem">Recuperando archivo...</p>`;
    return;
  }

  const head = document.createElement('p');
  head.className = 't-dim';
  head.style.cssText = 'font-size:.58rem;letter-spacing:.18em;margin:0 0 .8rem';
  head.textContent = `${Vault.open.size}/${Vault.total} PARTES DESCLASIFICADAS`;
  body.appendChild(head);

  for (const f of Vault.manifest.fragments) {
    const data = Vault.open.get(f.id);
    const due = new Date(f.unlockAt).getTime() <= Date.now();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frag';
    btn.dataset.open = data ? 'true' : 'false';
    btn.dataset.id = f.id;
    btn.innerHTML = `<span class="n">${pad(f.id)}</span><span class="nm"></span>
      <span class="st">${data ? 'LEGIBLE' : due ? 'EN COLA' : 'CIFRADO'}</span>`;
    const nm = btn.querySelector('.nm');
    nm.textContent = data ? data.codename : due ? 'PENDIENTE DE LLAVE' : noise(16);

    if (data) {
      btn.addEventListener('click', () => openDoc(f.id));
      if (!State.seen.has(f.id)) btn.style.borderLeftColor = 'var(--amber)';
    } else {
      btn.disabled = true;
      btn.title = due ? 'La llave aún no se ha publicado.' : 'Se desclasifica el ' + fmtDate(f.unlockAt);
      if (!due) scrambleTimers.push(setInterval(() => { nm.textContent = noise(16); }, 900 + f.id * 140));
    }
    body.appendChild(btn);
  }

  const nx = Vault.next;
  const foot = document.createElement('p');
  foot.className = 'frag-next';
  foot.innerHTML = nx
    ? `PRÓXIMA DESCLASIFICACIÓN · <b>${fmtDate(nx.unlockAt)}</b>`
    : 'EXPEDIENTE COMPLETO.';
  body.appendChild(foot);
}

async function openDoc(id) {
  const data = Vault.open.get(id);
  if (!data) return;

  State.seen.add(id);
  store.set('seen', [...State.seen]);

  const win = Win.open({ id: 'doc' + id, title: `PARTE ${pad(id)} — ${data.codename}`, w: 540, h: 440 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `<div class="doc">
    <h4>${data.codename}</h4>
    <p class="meta">PARTE ${pad(id)} DE ${pad(Vault.total)} · EXPEDIENTE 11-19</p>
    <div id="docBody"></div>
    <p class="kw">PALABRA REGISTRADA · <b>${data.clave}</b></p>
  </div>`;

  const target = win.body.querySelector('#docBody');
  for (const lineText of data.body) {
    const p = document.createElement('p');
    target.appendChild(p);
    if (REDUCED) { p.textContent = lineText; continue; }
    const steps = 6;
    for (let s = 0; s <= steps; s++) {
      const shown = Math.floor((lineText.length * s) / steps);
      p.textContent = lineText.slice(0, shown) + noise(Math.min(12, lineText.length - shown));
      await wait(26);
    }
    p.textContent = lineText;
    Sound.blip(560 + Math.random() * 260, 0.025, 0.04);
    await wait(60);
  }
  refreshExpedienteIfOpen();
}

function refreshExpedienteIfOpen() {
  const w = Win.get('exp');
  if (w) renderExpediente(w.body);
}

/* ─────────────────────────────────────────────────────────────
   triangulación final
   ───────────────────────────────────────────────────────────── */
function openFinal() {
  const win = Win.open({ id: 'final', title: 'TRIANGULACIÓN — posición del encuentro', w: 480, h: 400 });
  win.body.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'final';

  for (const [k, c] of Object.entries(CONFIG.claves)) {
    const got = State.hasClave(k);
    const row = document.createElement('div');
    row.className = 'slot';
    row.innerHTML = `<span class="lb">${c.label}</span>
      <span class="vl ${got ? '' : 'pend'}">${got ? c.value : '· · · · · ·'}</span>`;
    wrap.appendChild(row);
  }

  const box = document.createElement('div');
  box.className = 'sealed';

  if (!State.complete) {
    const falta = Object.entries(CONFIG.claves).filter(([k]) => !State.hasClave(k)).map(([, c]) => c.from);
    box.innerHTML = `Faltan lecturas. Sin las tres no hay posición.<br>
      Pendiente de: <b>${falta.join(' · ')}</b>`;
  } else {
    const f8 = Vault.manifest?.fragments.find((f) => f.id === 8);
    const abierto = Vault.open.get(8);
    if (abierto) {
      box.innerHTML = `POSICIÓN CONFIRMADA · <b>${CONFIG.claves.lat.value}, ${CONFIG.claves.lon.value}</b>
        a las <b>${CONFIG.claves.hora.value}</b>.<br><br>
        El expediente está cerrado. La transmisión ha empezado.`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = 'ABRIR CANALES';
      btn.style.marginTop = '.9rem';
      btn.addEventListener('click', openCanales);
      wrap.append(box, btn);
      win.body.appendChild(wrap);
      Sound.fanfare();
      return;
    }
    box.innerHTML = `POSICIÓN TRIANGULADA · <b>${CONFIG.claves.lat.value}, ${CONFIG.claves.lon.value}</b>
      a las <b>${CONFIG.claves.hora.value}</b>.<br><br>
      La última parte del expediente sigue cifrada. Se abre sola el
      <b>${f8 ? fmtDate(f8.unlockAt) : '19.11.2026'}</b>, no antes.<br>
      Vuelva ese día, agente.`;
  }

  wrap.appendChild(box);
  win.body.appendChild(wrap);
}

/* ─────────────────────────────────────────────────────────────
   canales
   ───────────────────────────────────────────────────────────── */
function openCanales() {
  const win = Win.open({ id: 'chan', title: 'CONTACTO DE LA UNIDAD', w: 460, h: 260 });
  win.body.innerHTML = `<p class="t-dim" style="font-size:.6rem;letter-spacing:.16em;margin:0 0 .8rem">
      CANALES ABIERTOS · LA UNIDAD RESPONDE AQUÍ</p>
    <div class="chan-grid">${CONFIG.channels.map((c) =>
      `<a class="chan-link" href="${c.url}" target="_blank" rel="noopener noreferrer">
        <b>${c.name}</b><span>${c.handle}</span></a>`).join('')}</div>`;
}

/* ─────────────────────────────────────────────────────────────
   escritorio
   ───────────────────────────────────────────────────────────── */
const ICONS = [
  { id: 'term', gl: '▛', lb: 'CONSOLA', act: openConsole },
  { id: 'exp', gl: '▤', lb: 'EXPEDIENTE 11-19', act: openExpediente },
  { id: 'poster', gl: '◫', lb: 'CARTEL DE BÚSQUEDA', act: () => openPoster(ctxForGames) },
  { id: 'tri', gl: '◬', lb: 'TRIANGULAR', act: () => openTriangulacion(ctxForGames) },
  { id: 'final', gl: '⌖', lb: 'POSICIÓN', act: openFinal, needsAll: true },
];

function refreshIcons() {
  const ul = $('icons');
  ul.innerHTML = '';
  for (const ic of ICONS) {
    if (ic.needsAll && !State.complete) continue;
    const li = document.createElement('li');
    li.className = 'icon';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.innerHTML = `<span class="gl">${ic.gl}</span><span class="lb">${ic.lb}</span>`;
    const run = () => ic.act();
    li.addEventListener('dblclick', run);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
    // en pantallas táctiles no hay doble clic cómodo
    if (matchMedia('(pointer: coarse)').matches) li.addEventListener('click', run);
    ul.appendChild(li);
  }
}

function refreshStatus() {
  $('sbClaves').innerHTML = `CLAVES <b>${State.claves.size}/3</b>`;
}

/* ─────────────────────────────────────────────────────────────
   credencial y reloj
   ───────────────────────────────────────────────────────────── */
function agent() {
  let a = store.get('agent');
  if (!a) {
    const L = 'ABCDEFGHJKLMNPRSTVWXZ';
    a = {
      id: L[(Math.random() * L.length) | 0] + L[(Math.random() * L.length) | 0] + '-' + pad((Math.random() * 9999) | 0, 4),
      since: new Date().toISOString(),
    };
    store.set('agent', a);
  }
  return a;
}

function tick() {
  const now = new Date();
  $('tbClock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const ms = TARGET.getTime() - now.getTime();
  const el = $('sbCountdown');
  if (ms <= 0) { el.textContent = 'PLAZO VENCIDO · EXPEDIENTE CERRADO'; return; }
  const s = Math.floor(ms / 1000);
  el.textContent = `PLAZO ${pad(Math.floor(s / 86400), 3)}d ${pad(Math.floor(s / 3600) % 24)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`;
}

/* ─────────────────────────────────────────────────────────────
   arranque
   ───────────────────────────────────────────────────────────── */
async function boot() {
  document.body.dataset.phase = 'live';
  $('login').classList.add('out');
  setTimeout(() => $('login').remove(), 700);
  $('shell').hidden = false;

  const a = agent();
  $('tbAgent').textContent = 'AGENTE ' + a.id;
  refreshStatus();
  refreshIcons();
  tick();
  setInterval(tick, 1000);

  openConsole();

  const ok = await Vault.load();
  refreshExpedienteIfOpen();

  if (!ok) {
    Term.type(['ERROR: sin enlace con el archivo central.',
      'Sirva la página desde un servidor (no file://).'], 't-warn');
  } else {
    Term.type([
      `ARCHIVO CENTRAL: ${Vault.open.size} de ${Vault.total} partes desclasificadas.`,
      Vault.next ? `SIGUIENTE: ${fmtDate(Vault.next.unlockAt)}` : 'EXPEDIENTE COMPLETO.',
    ], 't-ok');
  }

  // revisa cada 10 minutos por si se publicó una llave nueva
  setInterval(async () => {
    const before = Vault.open.size;
    await Vault.load();
    if (Vault.open.size > before) {
      refreshExpedienteIfOpen();
      Term.print('>> NUEVA PARTE DESCLASIFICADA EN EL EXPEDIENTE 11-19.', 't-ok');
      toast('NUEVA PARTE DESCLASIFICADA');
      Sound.fanfare();
    }
  }, 600000);
}

/* login */
$('loginBtn').addEventListener('click', () => {
  Sound.init();
  if (Sound.ctx?.state === 'suspended') Sound.ctx.resume();
  $('loginLine').textContent = 'CREDENCIAL ACEPTADA · CARGANDO ENTORNO';
  Sound.blip(1200, 0.1, 0.1);
  setTimeout(boot, 420);
});

/* sello del acceso */
document.querySelector('.login-seal').textContent = ASCII_K;

/* rotación de mensajes en el acceso */
(() => {
  const el = $('loginLine');
  const msgs = ['ESPERANDO CREDENCIAL', 'CANAL SEGURO ESTABLECIDO', 'NIVEL DE ACCESO: RESTRINGIDO'];
  let i = 0;
  const t = setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    el.textContent = msgs[++i % msgs.length];
  }, 2600);
})();

/* audio */
$('audioBtn').addEventListener('click', () => {
  const on = Sound.toggle();
  $('audioBtn').textContent = on ? '♪ ON' : '♪ OFF';
  $('audioBtn').setAttribute('aria-pressed', String(on));
});

/* atajos */
addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) {
    e.preventDefault();
    openConsole();
    document.querySelector('.term-in input')?.focus();
  }
});
