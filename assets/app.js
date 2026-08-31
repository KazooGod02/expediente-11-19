/* ════════════════════════════════════════════════════════════
   app.js — K.P.D. Terminal de campo
   ════════════════════════════════════════════════════════════ */
import {
  $, clamp, pad, wait, norm, noise, b64, store, toast, notify,
  Sound, Win, setWinsListener, REDUCED, ASCII_K, resolveInto, typeInto, pick,
} from './core.js';
import { openAnalisis, openCaja, openSecuencia, openDescifrar } from './games.js';
import { openPoster } from './poster.js';
import { Diario, openDiario, refreshDiarioIfOpen, avisarTareas, setTareaHandler } from './diario.js';
import { Eventos } from './eventos.js';

/* ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN — edita solo este bloque
   ───────────────────────────────────────────────────────────── */
const CONFIG = {
  // Transmisión final, en la HORA LOCAL de quien visita.
  target: { year: 2026, month: 11, day: 19, hour: 0, minute: 0 },

  // ⚠️ EL TRÁILER. Pega la URL cuando lo tengas montado.
  // Hasta esa fecha la ventana muestra cuenta atrás; sin URL, avisa de que falta.
  trailer: {
    url: '',                                  // p.ej. 'https://youtu.be/XXXXXXXX'
    releaseAt: '2026-11-12T21:00:00Z',
    titulo: 'PRUEBA AUDIOVISUAL 11-19',
  },

  channels: [
    { name: 'TWITCH',  handle: '@kazoogod02', url: 'https://twitch.tv/kazoogod02' },
    { name: 'YOUTUBE', handle: '@kazoogod02', url: 'https://youtube.com/@kazoogod02' },
    { name: 'KICK',    handle: '@kazoogod02', url: 'https://kick.com/kazoogod02' },
    { name: 'TIKTOK',  handle: '@kazoogod02', url: 'https://tiktok.com/@kazoogod02' },
  ],

  // Lo que entrega cada ejercicio.
  claves: {
    lat:   { label: 'LATITUD',  value: '25.7617',   from: 'ANALIZAR' },
    lon:   { label: 'LONGITUD', value: '-80.1918',  from: 'CAJA 419' },
    hora:  { label: 'HORA',     value: '00:00',     from: 'SECUENCIA' },
    fecha: { label: 'FECHA',    value: '12.11.2026', from: 'DESCIFRAR' },
  },

  sujetos: [
    { n: 1, sil: '◍', rol: 'EL QUE MIRA LAS CÁMARAS',
      det: 'Camina despacio. Sabe cuántas hay y dónde. Once segundos de vídeo y ni un fotograma con cara.' },
    { n: 2, sil: '◎', rol: 'EL QUE NO BAJA DEL COCHE',
      det: 'Espera en el vano con el motor encendido a treinta metros. Repostó el vehículo antes de quemarlo.' },
    { n: 3, sil: '◌', rol: 'EL QUE NO SALE EN NINGÚN FOTOGRAMA',
      det: 'No hay imagen, ni huella, ni voz. Sabemos que estuvo porque la 419 se abrió desde dentro.' },
  ],
};

const T = CONFIG.target;
const TARGET = new Date(T.year, T.month - 1, T.day, T.hour, T.minute, 0, 0);
const TRAILER_AT = new Date(CONFIG.trailer.releaseAt);

/* ─────────────────────────────────────────────────────────────
   mensajes de la central
   ───────────────────────────────────────────────────────────── */
const MENSAJES = [
  { id: 'm1', de: 'CENTRAL', as: 'Asignación del expediente 11-19', cuando: 'al entrar',
    cuerpo: [
      'Agente, bienvenido a la División de Casos Abiertos.',
      'Se le asigna el 11-19 porque lleva catorce meses pasando de mesa en mesa y nadie ha querido cerrarlo.',
      'Tiene el expediente en el escritorio. Se desclasifica por partes: no me pregunte por qué, la orden viene de arriba.',
      'Lea. Use las herramientas. No haga ruido.',
    ] },
  { id: 'm2', de: 'ARCHIVO', as: 'Sobre el material que va a recibir', cuando: 'al entrar',
    cuerpo: [
      'Las partes del expediente llegan cifradas y se abren solas en su fecha.',
      'No insista con las que están cerradas: no las tenemos retenidas, es que la llave todavía no existe.',
      'Si necesita el listado de utilidades autorizadas, escriba HERRAMIENTAS en la consola.',
    ] },
  { id: 'm3', de: 'LABORATORIO', as: 'Vehículo calcinado — informe preliminar', trasSeg: 45,
    cuerpo: [
      'Terminamos con el coche del camino de servicio.',
      'Depósito lleno. Alguien lo repostó antes de prenderle fuego, lo cual no tiene ningún sentido salvo que quisieran que ardiera bien.',
      'Cuentakilómetros manipulado a mano, no por electrónica. Trabajo de alguien con paciencia.',
      'Del resguardo de peaje sólo se salvó el reverso. Tres cifras. Se las paso al de señales.',
    ] },
  { id: 'm4', de: 'SEÑALES', as: 'Las tres cifras son distancias', trasSeg: 95,
    cuerpo: [
      'No es una matrícula. No es un teléfono.',
      'Son distancias a tres repetidores. Con eso se fija un punto en el plano.',
      'Le he dejado la cinta del vestíbulo cargada en su equipo. Escriba ANALIZAR.',
    ] },
  { id: 'm5', de: 'CENTRAL', as: 'Primera lectura confirmada', trasClaves: 1,
    cuerpo: [
      'Bien. Ha fijado la primera coordenada.',
      'Le aviso de una cosa: el expediente menciona utilidades que no aparecen en el índice de HERRAMIENTAS.',
      'No es un error del sistema. Léalo entero y las encontrará.',
    ] },
  { id: 'm6', de: 'TÉCNICO', as: 'Sobre la radio en abierto', trasClaves: 2,
    cuerpo: [
      'Llevan meses hablando delante de nosotros y no usan palabras.',
      'He reproducido el emisor. No es un cifrado: es una prueba de acceso.',
      'Si devuelve la secuencia entera, contesta. Suba el volumen.',
    ] },
  { id: 'm7', de: '—', as: 'sin remitente', trasSeg: 210,
    cuerpo: [
      'no somos ladrones.',
      'lo de la caja llevaba once años esperando a que alguien lo mirara.',
      'no nos busque en el mirador. busque la fecha.',
      'y deje de leer el correo del trabajo a estas horas.',
    ] },
  { id: 'm8', de: 'CENTRAL', as: 'Las cuatro lecturas', trasClaves: 4,
    cuerpo: [
      'Tiene las cuatro. Posición, hora y fecha.',
      'Lo que hay en esa fecha no es una detención: es una grabación que ellos mismos van a dejar.',
      'La ventana POSICIÓN del escritorio le dirá dónde. La otra, cuándo.',
      'Yo de usted, agente, ese día no haría planes.',
    ] },
];

/* ─────────────────────────────────────────────────────────────
   estado
   ───────────────────────────────────────────────────────────── */
const State = {
  claves: new Set(store.get('claves', [])),
  seen: new Set(store.get('seen', [])),
  leidos: new Set(store.get('leidos', [])),
  entregados: new Map(Object.entries(store.get('entregados', {}))),

  hasClave(id) { return this.claves.has(id); },
  get total() { return Object.keys(CONFIG.claves).length; },
  get complete() { return Object.keys(CONFIG.claves).every((k) => this.claves.has(k)); },

  grantClave(id) {
    if (this.claves.has(id)) return;
    this.claves.add(id);
    store.set('claves', [...this.claves]);
    refreshStatus(); refreshIcons();
    toast(`LECTURA OBTENIDA · ${CONFIG.claves[id].label}`);
    Term.print(`>> LECTURA REGISTRADA: ${CONFIG.claves[id].label} = ${CONFIG.claves[id].value}`, 't-ok');
    entregarMensajes();
    refreshReporteIfOpen();
    avisoTarea('tool', { lat: 'tri', lon: 'caja', hora: 'seq', fecha: 'cip' }[id]);
    if (this.complete) {
      Term.print('>> LAS CUATRO LECTURAS ESTÁN EN SU PODER. ESCRIBA POSICION.', 't-ok');
      notify('CENTRAL', 'Cuatro lecturas confirmadas. Abra POSICIÓN.', openFinal);
    }
  },
};

/** Avisa al parte diario de que se ha hecho algo que puede cerrar una tarea. */
function avisoTarea(kind, value) {
  const cerradas = Diario.notificar(kind, value);
  if (cerradas.length) { avisarTareas(cerradas); refreshIcons(); }
}

const gameCtx = {
  claves: CONFIG.claves,
  hasClave: (id) => State.hasClave(id),
  grantClave: (id) => State.grantClave(id),
};

/* ─────────────────────────────────────────────────────────────
   expediente cifrado
   ───────────────────────────────────────────────────────────── */
const Vault = {
  manifest: null, keys: {}, keysDias: {}, open: new Map(), offline: false,

  async load() {
    const bust = '?v=' + Math.floor(Date.now() / 600000);
    try {
      const [m, k] = await Promise.all([
        fetch('data/fragments.json' + bust).then((r) => r.json()),
        fetch('data/keys.json' + bust).then((r) => (r.ok ? r.json() : { keys: {} })).catch(() => ({ keys: {} })),
      ]);
      this.manifest = m; this.keys = k.keys || {}; this.keysDias = k.dias || {};
    } catch { this.offline = true; return false; }

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
    return this.manifest.fragments.filter((f) => !this.open.has(f.id))
      .sort((a, b) => new Date(a.unlockAt) - new Date(b.unlockAt))[0] || null;
  },
};

const fmtDate = (d) => new Date(d).toLocaleString('es', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const fmtDay = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'long' });

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

  type(lines, cls = 't-dim', speed = 9) {
    this.queue = this.queue.then(async () => {
      for (const line of [].concat(lines)) {
        const p = this.print('', cls);
        if (!p) return;
        await typeInto(p, line, speed);
        this.out.scrollTop = this.out.scrollHeight;
        await wait(24);
      }
    });
    return this.queue;
  },
};

const HELP = [
  'DIARIO         parte del día y tareas',
  'EXPEDIENTE     partes del caso 11-19',
  'INFORME        lo que lleva escrito del caso',
  'MENSAJES       correo interno',
  'HERRAMIENTAS   utilidades autorizadas',
  'CARTEL         generador de carteles de búsqueda',
  'CLAVES         lecturas en su poder',
  'POSICION       triangulación final',
  'AGENTE         su credencial',
  'ESTADO         situación del caso',
  'CANALES        contacto de la unidad',
  'LIMPIAR        vacía la consola',
];

function openConsole() {
  const win = Win.open({ id: 'term', title: 'CONSOLA — terminal de campo', w: 640, h: 480, cls: 'term-win' });
  if (win.body.dataset.built) { win.root.querySelector('.term-in input')?.focus(); return; }
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
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  Term.art(ASCII_K);
  Term.type([
    'KAZOO POLICE DEPARTMENT · TERMINAL DE CAMPO v11.19',
    `CREDENCIAL ${agent().id} VERIFICADA`,
    'Escriba AYUDA para ver los comandos autorizados.',
  ], 't-sys', 6);

  setTimeout(() => input.focus(), 140);
}

function command(raw) {
  const line = norm(raw);
  if (!line) return;
  Term.print('> ' + line, 't-cmd');
  Sound.blip(520, 0.03, 0.045);

  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');
  avisoTarea('cmd', line);
  if (arg) avisoTarea('cmd', cmd);

  switch (cmd) {
    case 'AYUDA': case 'HELP': case '?':
      Term.type(['COMANDOS AUTORIZADOS:', ...HELP, '',
        'Este terminal acepta más órdenes de las que enseña.'], 't-sys');
      break;

    case 'DIARIO': case 'PARTE':
      openDiario(); Term.print('Abriendo el parte diario...', 't-ok'); break;

    case 'EXPEDIENTE': case 'CASO':
      openExpediente(); Term.print('Abriendo expediente 11-19...', 't-ok'); break;

    case 'INFORME': case 'REPORTE': case 'SUJETOS':
      openReporte(); Term.print('Abriendo su informe...', 't-ok'); break;

    case 'ANTIVIRUS': case 'PURGA':
      if (!Eventos.antivirus()) Term.type(['No hay nada que purgar. De momento.'], 't-ok');
      break;

    case 'LLAMAR': case 'CENTRALITA':
      Eventos.lanzarLlamada();
      Term.type(['Solicitud enviada a centralita. Le devolverán la llamada.'], 't-ok'); break;

    case 'MENSAJES': case 'CORREO':
      openMensajes(); Term.print('Abriendo correo interno...', 't-ok'); break;

    case 'HERRAMIENTAS': case 'UTILIDADES':
      Term.type([
        'UTILIDADES DE CAMPO AUTORIZADAS:',
        '  ANALIZAR      análisis fotograma a fotograma de la cinta',
        '  CARTEL        generador de carteles de búsqueda',
        '',
        'Este equipo tiene tres simuladores más que no figuran en el índice.',
        'El expediente dice cuáles y cómo se llaman. Léalo entero.',
      ], 't-ok');
      break;

    case 'ANALIZAR': case 'CINTA': case 'CAMARA':
      openAnalisis(gameCtx); Term.print('Cargando la cinta del vestíbulo...', 't-ok'); break;

    case 'CAJA':
      if (arg && arg !== '419') { Term.type(['No hay ninguna caja con ese número en el inventario.'], 't-warn'); break; }
      openCaja(gameCtx); Term.print('Cargando simulador de cerradura...', 't-ok'); break;

    case 'SECUENCIA': case 'TONOS':
      openSecuencia(gameCtx); Term.print('Cargando reproductor de secuencia...', 't-ok'); break;

    case 'DESCIFRAR': case 'NOTA': case 'MIRADOR':
      openDescifrar(gameCtx); Term.print('Cargando la nota del mirador...', 't-ok'); break;

    case 'CARTEL': case 'WANTED': case 'BUSCA':
      openPoster(); Term.print('Abriendo generador de carteles...', 't-ok'); break;

    case 'CLAVES': case 'LECTURAS': {
      const rows = Object.entries(CONFIG.claves).map(([k, c]) =>
        `  ${c.label.padEnd(9)} ${State.hasClave(k) ? c.value : '— pendiente (' + c.from + ')'}`);
      Term.type(['LECTURAS EN SU PODER:', ...rows,
        ...(State.complete ? ['', 'Completo. Escriba POSICION.'] : [])], State.complete ? 't-ok' : 't-sys');
      break;
    }

    case 'POSICION': case 'TRIANGULACION':
      openFinal(); break;

    case 'TRAILER': case 'CINTA': case 'PRUEBA':
      openTrailer(); break;

    case 'AGENTE': case 'CREDENCIAL': {
      const a = agent();
      Term.type([`IDENTIFICADOR .. ${a.id}`, `ALTA ........... ${fmtDate(a.since)}`,
        `LECTURAS ....... ${State.claves.size}/${State.total}`], 't-ok');
      break;
    }

    case 'ESTADO': {
      const d = Math.max(0, Math.floor((TARGET.getTime() - Date.now()) / 86400000));
      Term.type([
        'CASO ........... 11-19 (abierto)',
        `EXPEDIENTE ..... ${Vault.open.size}/${Vault.total} partes desclasificadas`,
        `SIGUIENTE ...... ${Vault.next ? fmtDate(Vault.next.unlockAt) : 'ninguna'}`,
        `LECTURAS ....... ${State.claves.size}/${State.total}`,
        `SIN LEER ....... ${sinLeer()} mensajes`,
        `PLAZO .......... ${d} días`,
      ], 't-ok');
      break;
    }

    case 'CANALES': case 'CONTACTO':
      openCanales(); Term.print('Abriendo canales de la unidad...', 't-ok'); break;

    case 'TRANSMISION': case 'TRANSMISIÓN':
      if (Vault.open.has(8)) { openCanales(); Term.type(['La transmisión ha empezado.'], 't-ok'); }
      else Term.type(['La transmisión no está abierta todavía.',
        `Vuelva el ${fmtDate(TARGET)}.`], 't-warn');
      break;

    case 'LIMPIAR': case 'CLEAR':
      Term.out.innerHTML = ''; break;

    case 'K': case 'KPD':
      Term.art(ASCII_K);
      Term.type(['Kazoo Police Department.', 'Nadie recuerda quién fue Kazoo.'], 't-hi');
      break;

    /* ── órdenes que no figuran en el índice ── */
    case '1': case '2': case '3': {
      const s = CONFIG.sujetos.find((x) => String(x.n) === cmd);
      Term.type([`SUJETO ${s.n} — ${s.rol}`, s.det], 't-cmd'); break;
    }
    case '419':
      Term.type(['Caja 419. Alquilada once años. Abierta una vez.',
        'Si quiere ver la cerradura, escriba CAJA 419.'], 't-warn'); break;
    case 'MERIDIANO': case 'BANCO':
      Term.type(['Sucursal 7. Cuatro minutos. Cero disparos.',
        'Nadie ha denunciado el robo. Piense en eso.'], 't-warn'); break;
    case 'SPOILER': case 'TRAMPA': case 'HACK':
      Term.type(['Adelante, agente.', 'Las partes del expediente van en AES-256-GCM.',
        'Sus llaves no están en este equipo ni en el servidor: se publican solas, el día que toca.',
        'No hay nada que forzar. Sólo que esperar.'], 't-warn');
      Sound.buzz(); break;
    case 'FECHA':
      Term.type([`Hoy: ${fmtDate(Date.now())}`, `Plazo: ${fmtDate(TARGET)}`], 't-dim'); break;

    default:
      Term.type([`Orden no reconocida: ${cmd}`, 'Escriba AYUDA.'], 't-warn');
  }
}

/* ─────────────────────────────────────────────────────────────
   expediente
   ───────────────────────────────────────────────────────────── */
let scrambleTimers = [];

function openExpediente() {
  const win = Win.open({ id: 'exp', title: 'EXPEDIENTE 11-19 — partes desclasificadas', w: 540, h: 450 });
  renderExpediente(win.body);
}

function renderExpediente(body) {
  scrambleTimers.forEach(clearInterval);
  scrambleTimers = [];
  body.innerHTML = '';

  if (Vault.offline) {
    body.innerHTML = `<p class="t-warn" style="font-size:.7rem">SIN ENLACE CON EL ARCHIVO CENTRAL.
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
    btn.className = 'frag' + (data && !State.seen.has(f.id) ? ' nuevo' : '');
    btn.dataset.open = data ? 'true' : 'false';
    btn.dataset.id = f.id;
    btn.innerHTML = `<span class="n">${pad(f.id)}</span><span class="nm"></span>
      <span class="st">${data ? 'LEGIBLE' : due ? 'EN COLA' : 'CIFRADO'}</span>`;
    const nm = btn.querySelector('.nm');
    nm.textContent = data ? data.codename : due ? 'PENDIENTE DE LLAVE' : noise(16);

    if (data) btn.addEventListener('click', () => openDoc(f.id));
    else {
      btn.disabled = true;
      btn.title = due ? 'La llave aún no se ha publicado.' : 'Se desclasifica el ' + fmtDate(f.unlockAt);
      if (!due) scrambleTimers.push(setInterval(() => { nm.textContent = noise(16); }, 900 + f.id * 140));
    }
    body.appendChild(btn);
  }

  const nx = Vault.next;
  const foot = document.createElement('p');
  foot.className = 'frag-next';
  foot.innerHTML = nx ? `PRÓXIMA DESCLASIFICACIÓN · <b>${fmtDate(nx.unlockAt)}</b>` : 'EXPEDIENTE COMPLETO.';
  body.appendChild(foot);
}

async function openDoc(id) {
  const data = Vault.open.get(id);
  if (!data) return;
  State.seen.add(id);
  store.set('seen', [...State.seen]);

  const win = Win.open({ id: 'doc' + id, title: `PARTE ${pad(id)} — ${data.codename}`, w: 560, h: 460 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `<div class="doc">
    <h4>${data.codename}</h4>
    <p class="meta">PARTE ${pad(id)} DE ${pad(Vault.total)} · EXPEDIENTE 11-19 · K.P.D.</p>
    <div id="docBody"></div>
    <p class="kw">PALABRA REGISTRADA · <b>${data.clave}</b></p>
  </div>`;

  const target = win.body.querySelector('#docBody');
  for (const lineText of data.body) {
    const p = document.createElement('p');
    target.appendChild(p);
    await resolveInto(p, lineText);
    Sound.blip(560 + Math.random() * 240, 0.022, 0.035);
    await wait(50);
  }
  refreshExpedienteIfOpen();
  refreshReporteIfOpen();
  refreshIcons();
  avisoTarea('frag', id);
}

function refreshExpedienteIfOpen() {
  const w = Win.get('exp');
  if (w) renderExpediente(w.body);
}

/* ─────────────────────────────────────────────────────────────
   informe del agente

   No es una ficha: es lo que el protagonista lleva escrito hasta
   hoy. Cada línea aparece cuando se cumple su condición, así que
   el informe crece contigo. Las anotaciones personales se le van
   escapando de las manos según avanza.
   ───────────────────────────────────────────────────────────── */
const REPORTE = [
  // ── hechos ──
  { s: 'HECHOS', si: () => Vault.open.has(1),
    t: 'Sucursal 7 del Banco Meridiano, 03:41. Cuatro minutos exactos dentro. Tres personas.' },
  { s: 'HECHOS', si: () => Vault.open.has(1),
    t: 'No se disparó un solo tiro. No se forzó ninguna puerta. No se tocó ninguna otra caja.' },
  { s: 'HECHOS', si: () => Vault.open.has(1),
    t: 'Sustraído: el contenido íntegro de la caja de seguridad 419. Nada más.' },
  { s: 'HECHOS', si: () => Vault.open.has(3),
    t: '1.4 millones en efectivo permanecían a dos metros del punto de acceso. Intactos.' },
  { s: 'HECHOS', si: () => Vault.open.has(3),
    t: 'La 419 figuraba a nombre de una sociedad disuelta hace once años. Contenido declarado: "documentos".' },
  { s: 'HECHOS', si: () => Vault.open.has(3),
    t: 'Nadie ha denunciado el robo. El titular de la caja no ha llamado ni una vez.' },
  { s: 'HECHOS', si: () => Vault.open.has(4),
    t: 'Vehículo hallado calcinado once días después. Repostado antes del incendio. Cuentakilómetros manipulado a mano.' },
  { s: 'HECHOS', si: () => Vault.open.has(5),
    t: 'La cerradura de la 419 no fue forzada. Fue abierta. Cuatro dígitos, sin herramienta.' },
  { s: 'HECHOS', si: () => Vault.open.has(6),
    t: 'Emisión de radio en abierto desde la zona del mirador. Todas las noches, la misma hora, sin palabras.' },
  { s: 'HECHOS', si: () => Vault.open.has(7),
    t: 'Nota manuscrita hallada en el mirador, cifrada por sustitución simple.' },

  // ── los tres ──
  { s: 'LOS TRES', si: () => Vault.open.has(2),
    t: 'SUJETO 1 — Camina despacio y mira las cámaras de frente. Sabe cuántas hay y dónde están.' },
  { s: 'LOS TRES', si: () => Vault.open.has(2),
    t: 'SUJETO 2 — No llega a entrar. Espera en el vano con el motor encendido a treinta metros.' },
  { s: 'LOS TRES', si: () => Vault.open.has(2),
    t: 'SUJETO 3 — No aparece en ningún fotograma. Sabemos que estuvo porque la 419 se abrió desde dentro.' },
  { s: 'LOS TRES', si: () => State.hasClave('lat'),
    t: 'Corrección: hay un reflejo en el cristal que no corresponde a nadie del plano. Puede que fueran cuatro. Puede que el tercero estuviera en otro sitio.' },
  { s: 'LOS TRES', si: () => Vault.open.has(7),
    t: 'Vistos juntos por última vez en el mirador. Sin prisa, sin equipaje. El testigo dice que no huían: esperaban.' },

  // ── hipótesis ──
  { s: 'HIPÓTESIS', si: () => Vault.open.has(3),
    t: 'Descartada la motivación económica. Dejaron el dinero a la vista.' },
  { s: 'HIPÓTESIS', si: () => Vault.open.has(3),
    t: 'Alguien pagó once años de alquiler para que el contenido de esa caja llegara intacto a una fecha concreta.' },
  { s: 'HIPÓTESIS', si: () => State.claves.size >= 2,
    t: 'Los tres se conocían de antes. Mucho antes. Esto no se improvisa en once años.' },
  { s: 'HIPÓTESIS', si: () => State.hasClave('fecha'),
    t: 'La nota anuncia que dejarán una grabación antes de la fecha. No es una amenaza: es una cita.' },
  { s: 'HIPÓTESIS', si: () => State.complete,
    t: 'Conclusión provisional: el 11-19 no es un robo. Es una entrega que llevaba once años en curso.' },

  // ── anotaciones personales ──
  { s: 'ANOTACIONES', si: () => State.claves.size >= 1,
    t: 'Llevo tres días con esto y todavía no sé qué estoy buscando.' },
  { s: 'ANOTACIONES', si: () => State.claves.size >= 2,
    t: 'He vuelto a quedarme pasada la medianoche. Nadie me lo ha pedido.' },
  { s: 'ANOTACIONES', si: () => Vault.open.has(5),
    t: 'El sujeto 3 estuvo sentado delante de esa cerradura escuchándola. Doce intentos. Yo no tengo esa paciencia para nada.' },
  { s: 'ANOTACIONES', si: () => Vault.open.has(7),
    t: 'El testigo dijo que miraban el mar y contaban días. Llevo una semana pensando en esa frase.' },
  { s: 'ANOTACIONES', si: () => State.claves.size >= 3,
    t: 'Empiezo a tener la sensación de que el expediente me está leyendo a mí.' },
  { s: 'ANOTACIONES', si: () => State.complete,
    t: 'No quiero detenerlos. Ahí está el problema. Y creo que en Central ya lo saben.' },
  { s: 'ANOTACIONES', si: () => Vault.open.has(8),
    t: 'Cierro el expediente. No por orden: porque ya sé lo que había dentro, y no es asunto de la policía.' },
];

const SECCIONES = {
  HECHOS: 'HECHOS ESTABLECIDOS',
  'LOS TRES': 'LOS TRES SUJETOS',
  'HIPÓTESIS': 'HIPÓTESIS DE TRABAJO',
  ANOTACIONES: 'ANOTACIONES PERSONALES',
};

function openReporte() {
  avisoTarea('win', 'rep');
  const win = Win.open({ id: 'rep', title: 'INFORME DEL AGENTE — 11-19', w: 580, h: 480 });
  renderReporte(win.body);
}

function renderReporte(body) {
  const activas = REPORTE.filter((r) => { try { return r.si(); } catch { return false; } });
  const total = REPORTE.length;

  body.innerHTML = `
    <p class="rep-cab">REDACTA: AGENTE ${agent().id} · EXPEDIENTE 11-19 · K.P.D.</p>
    <div class="rep-prog"><span style="width:${(activas.length / total) * 100}%"></span></div>
    <p class="rep-sub">${activas.length} de ${total} entradas redactadas</p>
    <div id="repCuerpo"></div>`;

  const cuerpo = body.querySelector('#repCuerpo');

  for (const [clave, titulo] of Object.entries(SECCIONES)) {
    const lineas = activas.filter((r) => r.s === clave);
    const sec = document.createElement('section');
    sec.className = 'rep-sec' + (clave === 'ANOTACIONES' ? ' personal' : '');
    sec.innerHTML = `<h5>${titulo}</h5>`;

    if (!lineas.length) {
      sec.innerHTML += `<p class="rep-vacio">— sin entradas todavía —</p>`;
    } else {
      for (const l of lineas) {
        const p = document.createElement('p');
        p.className = 'rep-linea';
        p.textContent = l.t;
        sec.appendChild(p);
      }
    }
    cuerpo.appendChild(sec);
  }

  const pie = document.createElement('p');
  pie.className = 'rep-pie';
  pie.textContent = activas.length === total
    ? 'Informe cerrado.'
    : 'El informe se completa según avanza el expediente.';
  cuerpo.appendChild(pie);
}

function refreshReporteIfOpen() {
  const w = Win.get('rep');
  if (w) renderReporte(w.body);
}

/* ─────────────────────────────────────────────────────────────
   correo interno
   ───────────────────────────────────────────────────────────── */
/** Los entregados, del más reciente al más antiguo. */
function disponibles() {
  return MENSAJES
    .filter((m) => State.entregados.has(m.id))
    .sort((a, b) => State.entregados.get(b.id) - State.entregados.get(a.id));
}

const horaEntrega = (id) => {
  const t = State.entregados.get(id);
  return t ? new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';
};
const sinLeer = () => disponibles().filter((m) => !State.leidos.has(m.id)).length;

function entregarMensajes(silencioso = false) {
  const seg = (Date.now() - sesionInicio) / 1000;
  let nuevos = 0;
  for (const m of MENSAJES) {
    if (State.entregados.has(m.id)) continue;
    const listo =
      m.cuando === 'al entrar' ||
      (m.trasSeg !== undefined && seg >= m.trasSeg) ||
      (m.trasClaves !== undefined && State.claves.size >= m.trasClaves);
    if (!listo) continue;
    State.entregados.set(m.id, Date.now());
    nuevos += 1;
    if (!silencioso) notify(m.de, m.as, () => { openMensajes(); abrirMensaje(m.id); });
    // uno por vuelta: así gotean en lugar de amontonarse en la esquina
    break;
  }
  if (nuevos) {
    store.set('entregados', Object.fromEntries(State.entregados));
    refreshIcons();
    refreshMensajesIfOpen();
  }
}

function openMensajes() {
  avisoTarea('win', 'msg');
  const win = Win.open({ id: 'msg', title: 'CORREO INTERNO — K.P.D.', w: 540, h: 420 });
  renderMensajes(win.body);
}

function renderMensajes(body) {
  const lista = disponibles();
  body.innerHTML = `<p class="t-dim" style="font-size:.58rem;letter-spacing:.18em;margin:0 0 .8rem">
      ${lista.length} MENSAJES · ${sinLeer()} SIN LEER</p><div class="msg-list"></div>`;
  const wrap = body.querySelector('.msg-list');

  if (!lista.length) {
    wrap.innerHTML = `<p class="t-dim" style="font-size:.68rem">Bandeja vacía.</p>`;
    return;
  }

  for (const m of lista) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg' + (State.leidos.has(m.id) ? '' : ' unread');
    b.innerHTML = `<span class="de">${m.de}</span><span class="as"></span>
      <span class="dt">${State.leidos.has(m.id) ? horaEntrega(m.id) : 'NUEVO'}</span>`;
    b.querySelector('.as').textContent = m.as;
    b.addEventListener('click', () => abrirMensaje(m.id));
    wrap.appendChild(b);
  }
}

function refreshMensajesIfOpen() {
  const w = Win.get('msg');
  if (w) renderMensajes(w.body);
}

async function abrirMensaje(id) {
  const m = MENSAJES.find((x) => x.id === id);
  if (!m || !State.entregados.has(id)) return;
  State.leidos.add(id);
  store.set('leidos', [...State.leidos]);
  refreshMensajesIfOpen();
  refreshIcons();

  const win = Win.open({ id: 'msg' + id, title: `${m.de} — ${m.as}`, w: 520, h: 380 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';
  win.body.innerHTML = `<div class="msg-doc">
    <p class="from">DE: ${m.de} · PARA: AGENTE ${agent().id}</p>
    <h4>${m.as}</h4><div id="mb"></div></div>`;

  const mb = win.body.querySelector('#mb');
  for (const line of m.cuerpo) {
    const p = document.createElement('p');
    mb.appendChild(p);
    await typeInto(p, line, 7);
    await wait(40);
  }
}

/* ─────────────────────────────────────────────────────────────
   posición final
   ───────────────────────────────────────────────────────────── */
function openFinal() {
  avisoTarea('win', 'final');
  const win = Win.open({ id: 'final', title: 'TRIANGULACIÓN — punto de encuentro', w: 520, h: 480 });
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
    box.innerHTML = `Faltan lecturas. Sin las cuatro no hay punto de encuentro.<br>
      Pendiente de: <b>${falta.join(' · ')}</b>`;
    wrap.appendChild(box);
  } else {
    const cv = document.createElement('canvas');
    cv.className = 'map';
    cv.width = 460; cv.height = 200;
    wrap.appendChild(cv);
    dibujarMapa(cv);

    box.innerHTML = `PUNTO FIJADO · <b>${CONFIG.claves.lat.value}, ${CONFIG.claves.lon.value}</b><br>
      FECHA <b>${CONFIG.claves.fecha.value}</b> · HORA <b>${CONFIG.claves.hora.value}</b><br><br>
      Lo que dejaron en esa fecha no es un botín. Es una grabación.`;
    wrap.appendChild(box);

    const btn = document.createElement('button');
    btn.className = 'btn hot';
    btn.type = 'button';
    btn.style.marginTop = '.9rem';
    btn.textContent = 'ABRIR PRUEBA AUDIOVISUAL';
    btn.addEventListener('click', openTrailer);
    wrap.appendChild(btn);
  }

  win.body.appendChild(wrap);
}

/** Mapa decorativo: retícula, barrido y la marca del punto. */
function dibujarMapa(cv) {
  const cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  let t = 0;
  const px = W * 0.62, py = H * 0.44;

  (function loop() {
    if (!cv.isConnected) return;
    t += 0.02;
    cx.clearRect(0, 0, W, H);

    cx.strokeStyle = 'rgba(140,130,175,.1)';
    for (let x = 0; x <= W; x += 28) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = 0; y <= H; y += 28) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }

    // costa insinuada
    cx.strokeStyle = 'rgba(201,163,255,.3)';
    cx.lineWidth = 1.5;
    cx.beginPath();
    for (let x = 0; x <= W; x += 6) cx.lineTo(x, H * 0.72 + Math.sin(x * 0.02) * 12 + Math.sin(x * 0.006) * 20);
    cx.stroke();
    cx.lineWidth = 1;

    // pulsos
    for (let i = 0; i < 3; i++) {
      const r = ((t * 26 + i * 24) % 72);
      cx.strokeStyle = `rgba(255,122,208,${0.5 - r / 150})`;
      cx.beginPath(); cx.arc(px, py, r, 0, Math.PI * 2); cx.stroke();
    }
    cx.fillStyle = '#ff7ad0';
    cx.beginPath(); cx.arc(px, py, 3.5, 0, Math.PI * 2); cx.fill();

    cx.fillStyle = 'rgba(231,226,242,.75)';
    cx.font = '10px "Share Tech Mono", monospace';
    cx.fillText('PUNTO 11-19', px + 12, py - 8);

    requestAnimationFrame(loop);
  })();
}

/* ─────────────────────────────────────────────────────────────
   tráiler
   ───────────────────────────────────────────────────────────── */
function openTrailer() {
  avisoTarea('win', 'trailer');
  const win = Win.open({ id: 'trailer', title: CONFIG.trailer.titulo, w: 520, h: 380 });
  if (!State.complete) {
    win.body.innerHTML = `<p class="t-warn" style="font-size:.72rem;line-height:1.8">
      MATERIAL RESTRINGIDO.<br>Se necesitan las cuatro lecturas para acceder.</p>`;
    return;
  }

  const ahora = Date.now();
  const falta = TRAILER_AT.getTime() - ahora;

  if (falta > 0) {
    const d = Math.floor(falta / 86400000);
    const h = Math.floor(falta / 3600000) % 24;
    win.body.innerHTML = `<div class="final"><div class="sealed">
      La cinta existe pero todavía no está en el archivo.<br><br>
      DISPONIBLE EL <b>${fmtDate(TRAILER_AT)}</b><br>
      Faltan <b>${d} días y ${h} horas</b>.<br><br>
      Vuelva ese día, agente. Y avise a quien haga falta.
    </div></div>`;
    return;
  }

  if (!CONFIG.trailer.url) {
    win.body.innerHTML = `<div class="final"><div class="sealed">
      La fecha ha llegado pero el archivo audiovisual todavía no se ha subido al sistema.<br><br>
      <span class="t-dim">(Pega la URL en CONFIG.trailer.url dentro de assets/app.js.)</span>
    </div></div>`;
    return;
  }

  win.body.innerHTML = `<div class="final">
    <div class="sealed">Material recuperado del punto 11-19.<br>
      Grabado por los propios sujetos. Sin editar.</div>
    <a class="btn hot" style="display:inline-block;margin-top:1rem;text-decoration:none"
       href="${CONFIG.trailer.url}" target="_blank" rel="noopener noreferrer">REPRODUCIR</a>
  </div>`;
  Sound.fanfare();
}

/* ─────────────────────────────────────────────────────────────
   canales
   ───────────────────────────────────────────────────────────── */
function openCanales() {
  const win = Win.open({ id: 'chan', title: 'CONTACTO DE LA UNIDAD', w: 460, h: 250 });
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
  { id: 'term', gl: '▙', lb: 'CONSOLA', act: openConsole },
  { id: 'diario', gl: '▦', lb: 'PARTE DIARIO', act: () => openDiario(),
    badge: () => Diario.sinVer() || Diario.pendientesHoy() > 0 },
  { id: 'exp', gl: '▤', lb: 'EXPEDIENTE 11-19', act: openExpediente,
    badge: () => Vault.manifest && [...Vault.open.keys()].some((k) => !State.seen.has(k)) },
  { id: 'msg', gl: '✉', lb: 'CORREO', act: openMensajes, badge: () => sinLeer() > 0 },
  { id: 'rep', gl: '✒', lb: 'INFORME', act: openReporte },
  { id: 'poster', gl: '◫', lb: 'CARTEL', act: openPoster },
  { id: 'tape', gl: '▣', lb: 'ANÁLISIS DE CINTA', act: () => openAnalisis(gameCtx) },
  { id: 'final', gl: '⌖', lb: 'POSICIÓN', act: openFinal, need: () => State.complete },
  { id: 'trailer', gl: '▶', lb: 'PRUEBA A/V', act: openTrailer, need: () => State.complete },
];

/**
 * Sólo crea los iconos que falten y actualiza los avisos.
 * Nunca vacía la lista: hacerlo reiniciaba la animación de entrada
 * en cada refresco y el escritorio parpadeaba solo cada pocos segundos.
 */
function refreshIcons() {
  const ul = $('icons');
  if (!ul) return;
  let orden = 0;

  for (const ic of ICONS) {
    const visible = !ic.need || ic.need();
    let li = ul.querySelector(`.icon[data-id="${ic.id}"]`);

    if (!visible) { li?.remove(); continue; }

    if (!li) {
      li = document.createElement('li');
      li.className = 'icon';
      li.dataset.id = ic.id;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.style.animationDelay = orden * 55 + 'ms';
      li.innerHTML = `<span class="gl">${ic.gl}</span><span class="lb">${ic.lb}</span>`;
      const run = () => ic.act();
      li.addEventListener('dblclick', run);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
      });
      if (matchMedia('(pointer: coarse)').matches) li.addEventListener('click', run);
      // se inserta en su sitio para respetar el orden de ICONS
      const siguiente = [...ul.children][orden] || null;
      ul.insertBefore(li, siguiente);
    }

    // el aviso se actualiza sin tocar el resto del icono
    const quiere = !!ic.badge?.();
    const tiene = !!li.querySelector('.badge');
    if (quiere && !tiene) {
      const b = document.createElement('span');
      b.className = 'badge';
      li.appendChild(b);
    } else if (!quiere && tiene) {
      li.querySelector('.badge').remove();
    }
    orden += 1;
  }
}

function refreshStatus() {
  $('sbClaves').innerHTML = `LECTURAS <b>${State.claves.size}/${State.total}</b>`;
}

/* pulsar una tarea del parte lleva directamente a donde toca */
setTareaHandler((kind, value) => {
  refreshIcons();
  if (!kind) return;
  if (kind === 'frag') { openExpediente(); const d = Vault.open.get(Number(value)); if (d) openDoc(Number(value)); return; }
  if (kind === 'cmd') { openConsole(); command(value); return; }
  if (kind === 'win') {
    ({ msg: openMensajes, subj: openReporte, rep: openReporte, final: openFinal, trailer: openTrailer,
       exp: openExpediente, poster: openPoster }[value] || (() => {}))();
    return;
  }
  if (kind === 'tool') {
    ({ tri: () => openAnalisis(gameCtx), caja: () => openCaja(gameCtx),
       seq: () => openSecuencia(gameCtx), cip: () => openDescifrar(gameCtx) }[value] || (() => {}))();
  }
});

/* barra de tareas: una pestaña por ventana abierta */
setWinsListener((list) => {
  const bar = $('sbWins');
  if (!bar) return;
  bar.innerHTML = '';
  for (const w of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-win' + (w.focused && !w.mini ? ' active' : '');
    b.textContent = w.title.split('—')[0].trim();
    b.title = w.title;
    b.addEventListener('click', () => Win.toggle(w.id));
    bar.appendChild(b);
  }
});

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
  if (ms <= 0) { el.textContent = 'PLAZO VENCIDO'; return; }
  const s = Math.floor(ms / 1000);
  el.textContent = `${pad(Math.floor(s / 86400), 3)}d ${pad(Math.floor(s / 3600) % 24)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`;
}

/* ─────────────────────────────────────────────────────────────
   arranque
   ───────────────────────────────────────────────────────────── */
let sesionInicio = Date.now();

/* secuencia de arranque: fases con ritmo distinto, no una lista plana */
const BOOT = [
  ['KAZOO POLICE DEPARTMENT', 'hi'],
  ['TERMINAL DE CAMPO — BIOS 11.19', 'dm'],
  ['(c) K.P.D. SISTEMAS · TODOS LOS DERECHOS RESERVADOS', 'dm'],
  ['', 'dm'],
  ['> POST', 'hi'],
  ['  Procesador ......................... K7-2200  OK', 'ok'],
  ['  Memoria base ...................... 640 KB    OK', 'ok'],
  ['  Memoria extendida ................. 65536 KB  OK', 'ok'],
  ['  Controlador de vídeo .............. CGA/EGA   OK', 'ok'],
  ['  Unidad de cinta ................... AUSENTE', 'wr'],
  ['', 'dm'],
  ['> RED', 'hi'],
  ['  Enlace con archivo central ........ ESTABLE', 'ok'],
  ['  Latencia .......................... 41 ms', 'ok'],
  ['  Canal seguro ...................... NEGOCIADO', 'ok'],
  ['  Registro de acceso ................ ACTIVO', 'wr'],
  ['', 'dm'],
  ['> CRIPTOGRAFÍA', 'hi'],
  ['  Módulo AES-256-GCM ................ CARGADO', 'ok'],
  ['  Derivación HKDF-SHA256 ............ CARGADO', 'ok'],
  ['  Llaves de desclasificación ........ PARCIALES', 'wr'],
  ['  Piezas selladas ................... EN ESPERA DE FECHA', 'wr'],
  ['', 'dm'],
  ['> EXPEDIENTES ABIERTOS', 'hi'],
  ['  11-19 · BANCO MERIDIANO, SUCURSAL 7', 'ok'],
  ['  Estado ............................ SIN RESOLVER', 'wr'],
  ['  Antigüedad ........................ 14 MESES', 'wr'],
  ['  Agentes asignados previamente ..... 5', 'wr'],
  ['', 'dm'],
  ['Montando entorno de casos abiertos...', 'dm'],
  ['Preparando credencial...', 'dm'],
];

async function bootSequence() {
  const el = $('boot');
  const log = $('bootLog');
  const fill = $('bootFill');
  const pct = $('bootPct');

  let saltado = false;
  const saltar = () => { saltado = true; };
  el.addEventListener('click', saltar);
  addEventListener('keydown', saltar, { once: true });

  const cerrar = () => {
    el.classList.add('flash');
    setTimeout(() => el.remove(), 520);
    $('login').hidden = false;
  };

  if (REDUCED) { el.remove(); $('login').hidden = false; return; }

  const pinta = (i) => {
    const avance = Math.round(((i + 1) / BOOT.length) * 100);
    fill.style.width = avance + '%';
    pct.textContent = avance + '%';
  };

  const t0 = performance.now();
  const TOPE = 9000;                    // el arranque nunca pasa de nueve segundos

  for (let i = 0; i < BOOT.length; i++) {
    const [txt, cls] = BOOT[i];
    const p = document.createElement('p');
    p.className = cls;
    log.appendChild(p);
    while (log.scrollHeight > log.clientHeight && log.firstChild !== p) log.firstChild.remove();

    // si el usuario salta, o si el navegador nos está frenando
    // (pestaña en segundo plano), se vuelca lo que queda de golpe
    if (saltado || performance.now() - t0 > TOPE) {
      p.textContent = txt;
      for (let k = i + 1; k < BOOT.length; k++) {
        const q = document.createElement('p');
        q.className = BOOT[k][1];
        q.textContent = BOOT[k][0];
        log.appendChild(q);
        while (log.scrollHeight > log.clientHeight && log.firstChild !== q) log.firstChild.remove();
      }
      pinta(BOOT.length - 1);
      break;
    }

    if (txt) {
      // por bloques de seis: menos esperas, misma sensación
      for (let c = 0; c <= txt.length; c += 6) {
        p.textContent = txt.slice(0, c);
        await wait(cls === 'hi' ? 16 : 8);
      }
      p.textContent = txt;
      Sound.blip(cls === 'wr' ? 300 : 1400, 0.012, 0.02);
    }

    pinta(i);
    await wait(txt === '' ? 70 : cls === 'hi' ? 210 : 45);
  }

  pct.textContent = 'LISTO';
  await wait(saltado ? 220 : 640);
  cerrar();
}

async function boot() {
  document.body.dataset.phase = 'live';
  $('login').classList.add('out');
  setTimeout(() => $('login').remove(), 700);
  $('shell').hidden = false;
  sesionInicio = Date.now();

  const a = agent();
  $('tbAgent').textContent = 'AGENTE ' + a.id;
  refreshStatus();
  tick();
  setInterval(tick, 1000);

  openConsole();

  const ok = await Vault.load();
  await Diario.load(Vault.keysDias);
  refreshIcons();
  refreshExpedienteIfOpen();

  if (Diario.sinVer()) {
    setTimeout(() => notify('CENTRAL', 'Parte diario disponible.', () => openDiario()), 1400);
  }

  if (!ok) {
    Term.type(['ERROR: sin enlace con el archivo central.',
      'Sirva la página desde un servidor (no file://).'], 't-warn');
  } else {
    Term.type([
      `ARCHIVO CENTRAL: ${Vault.open.size} de ${Vault.total} partes desclasificadas.`,
      Vault.next ? `SIGUIENTE: ${fmtDate(Vault.next.unlockAt)}` : 'EXPEDIENTE COMPLETO.',
      `PARTE DIARIO: ${Diario.pendientesHoy()} tarea(s) pendientes. Escriba DIARIO.`,
    ], 't-ok');
  }

  Eventos.init({
    consola: (t, c) => Term.print(t, c),
    registrarLlamada: () => refreshIcons(),
  });
  setTimeout(() => Eventos.arrancar(), 12000);

  // primeros mensajes, con algo de retardo para que se noten
  setTimeout(() => entregarMensajes(), 2600);
  setInterval(() => entregarMensajes(), 9000);

  // revisa cada 10 minutos por si se publicó una llave nueva
  setInterval(async () => {
    const before = Vault.open.size;
    await Vault.load();
    const antesDias = Diario.abiertos.size;
    await Diario.load(Vault.keysDias);

    if (Vault.open.size > before) {
      refreshExpedienteIfOpen();
      Term.print('>> NUEVA PARTE DESCLASIFICADA EN EL EXPEDIENTE 11-19.', 't-ok');
      notify('ARCHIVO CENTRAL', 'Nueva parte desclasificada del 11-19.', openExpediente);
    }
    if (Diario.abiertos.size > antesDias) {
      refreshDiarioIfOpen();
      notify('CENTRAL', 'Ha bajado el parte del día.', () => openDiario());
    }
    refreshIcons();
  }, 600000);
}

/* login */
$('loginBtn').addEventListener('click', () => {
  Sound.init();
  if (Sound.ctx?.state === 'suspended') Sound.ctx.resume();
  $('loginLine').textContent = 'CREDENCIAL ACEPTADA · CARGANDO ENTORNO';
  Sound.blip(1180, 0.1, 0.09);
  setTimeout(boot, 420);
});

document.querySelector('.login-seal').textContent = ASCII_K;

(() => {
  const el = $('loginLine');
  const msgs = ['ESPERANDO CREDENCIAL', 'CANAL SEGURO ESTABLECIDO', 'NIVEL DE ACCESO: RESTRINGIDO'];
  let i = 0;
  const t = setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    el.textContent = msgs[++i % msgs.length];
  }, 2600);
})();

$('audioBtn').addEventListener('click', () => {
  const on = Sound.toggle();
  $('audioBtn').textContent = on ? '♪ ON' : '♪ OFF';
  $('audioBtn').setAttribute('aria-pressed', String(on));
});

addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) {
    e.preventDefault();
    openConsole();
    document.querySelector('.term-in input')?.focus();
  }
});

bootSequence();
