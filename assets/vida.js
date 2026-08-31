/* ════════════════════════════════════════════════════════════
   vida.js — lo que hace que la oficina parezca ocupada

   · Turno de noche: a partir de medianoche el terminal cambia
   · Radio policial: despachos ajenos al caso, de fondo
   · Papelera: expedientes descartados de otra gente
   · Un compañero de mesa que escribe mientras trabajas
   · Post-its que puedes dejar pegados
   ════════════════════════════════════════════════════════════ */
import { $, pad, wait, pick, rndInt, store, Sound, Win, toast, typeInto } from './core.js';

/* ─────────────────────────────────────────────────────────────
   1 · TURNO DE NOCHE
   ───────────────────────────────────────────────────────────── */
export const Turno = {
  esNoche() { const h = new Date().getHours(); return h >= 0 && h < 6; },

  aplicar() {
    const noche = this.esNoche();
    if (document.body.dataset.turno === (noche ? 'noche' : 'dia')) return false;
    document.body.dataset.turno = noche ? 'noche' : 'dia';
    const et = $('tbTurno');
    if (et) et.textContent = noche ? 'TURNO DE NOCHE' : 'TURNO DE DÍA';
    return noche;
  },

  vigilar(alEntrarLaNoche) {
    this.aplicar();
    setInterval(() => { if (this.aplicar()) alEntrarLaNoche?.(); }, 60000);
  },
};

/* ─────────────────────────────────────────────────────────────
   2 · RADIO POLICIAL
   ───────────────────────────────────────────────────────────── */
const DESPACHOS_DIA = [
  'Unidad 12, aviso por ruidos en el 40 de Alameda.',
  'Grúa solicitada en la rotonda del puerto. Sin heridos.',
  'Denuncia por hurto en el mercado. Un jamón. Repito: un jamón.',
  'Control de tráfico en la nacional, kilómetro 8.',
  'Persona desorientada en la estación. Trasladada a servicios sociales.',
  'Aviso de alarma en la sucursal 3. Falsa alarma. Otra vez.',
  'Unidad 7, cambio de turno. Recuerden fichar.',
  'Perro suelto en el polígono. Unidad 9 al lugar.',
  'Reyerta en el bar de la esquina. Dos avisos en una semana.',
  'Solicitan intérprete en comisaría central.',
];
const DESPACHOS_NOCHE = [
  'Unidad 4, vehículo estacionado con las luces dadas en el mirador.',
  'Sin novedad en el sector norte. Sin novedad en el sur.',
  'Aviso de música alta. El vecino ya no contesta al teléfono.',
  'Patrulla 2, ¿alguien sigue despierto en Casos Abiertos?',
  'Se ruega no usar el ascensor: sigue averiado.',
  'Alguien ha dejado la cafetera encendida en la tercera planta.',
  'Unidad 11, luces en la costa. Otra vez. Nadie al llegar.',
  'Central a todas las unidades: noche tranquila. Aprovechen.',
  'Frecuencia libre. Frecuencia libre.',
  'Si están viendo lo mismo que yo en el 106, apaguen la radio.',
];

export const Radio = {
  lineas: [],
  timer: 0,

  arrancar() {
    if (this.timer) return;
    const emitir = () => {
      const txt = pick(Turno.esNoche() ? DESPACHOS_NOCHE : DESPACHOS_DIA);
      const hora = new Date();
      this.lineas.unshift(`${pad(hora.getHours())}:${pad(hora.getMinutes())}  ${txt}`);
      this.lineas = this.lineas.slice(0, 3);
      this.pintar();
    };
    emitir();
    this.timer = setInterval(emitir, rndInt(38, 72) * 1000);
  },

  pintar() {
    const el = $('radio');
    if (!el) return;
    el.innerHTML = `<p class="radio-cab">RADIO · BANDA DE SERVICIO</p>` +
      this.lineas.map((l, i) => `<p class="radio-l${i === 0 ? ' nueva' : ''}"></p>`).join('');
    [...el.querySelectorAll('.radio-l')].forEach((p, i) => { p.textContent = this.lineas[i]; });
  },
};

/* ─────────────────────────────────────────────────────────────
   3 · PAPELERA
   ───────────────────────────────────────────────────────────── */
const DESCARTADOS = [
  { n: '04-77', t: 'Desaparición del quiosquero',
    c: ['Denunciado desaparecido por su hermana en marzo. Apareció en abril, en Benidorm.',
        'No quiso volver. La hermana pidió que no cerráramos el expediente por si acaso.',
        'Lleva dos años abierto por si acaso.'] },
  { n: '06-19', t: 'Robo de una máquina de tabaco',
    c: ['Se llevaron la máquina entera. Pesaba 180 kilos.',
        'Nunca entendimos cómo. La cámara del bar apuntaba al techo.'] },
  { n: '08-02', t: 'Ruidos en el edificio de correos',
    c: ['Tres denuncias en seis meses por golpes en el sótano.',
        'Bajamos dos veces. No hay sótano en los planos.',
        'Hay sótano.'] },
  { n: '09-41', t: 'Vehículo abandonado, matrícula ilegible',
    c: ['Aparcado once meses en el mismo sitio. Nadie lo reclamó.',
        'Al retirarlo estaba impecable por dentro. Depósito lleno.',
        'Me acordé de este cuando leí lo del 11-19.'] },
  { n: '10-13', t: 'Falsificación de entradas',
    c: ['Un chaval vendía entradas para un concierto que no existía.',
        'Devolvió el dinero a todo el mundo antes de que llegáramos.',
        'Archivado sin cargos.'] },
  { n: '11-05', t: 'Alarma de la sucursal 3',
    c: ['Salta cada martes a las 03:41. Siempre falsa.',
        'El banco dice que es el sistema. Yo digo que alguien la prueba.',
        'Nadie me hizo caso.'] },
  { n: '12-88', t: 'Perro sin dueño, zona portuaria',
    c: ['Lo recogimos cuatro veces. Siempre volvía al mismo muelle.',
        'La quinta vez lo dejamos ahí.',
        'Sigue ahí. Le llevamos comida los jueves.'] },
  { n: '13-19', t: 'Solicitud de acceso a la caja 419',
    c: ['Petición formal de acceso presentada hace once años.',
        'Denegada por falta de documentación.',
        'El solicitante no volvió a insistir.',
        'No consta el nombre. La casilla está en blanco.'] },
];

export function openPapelera() {
  const win = Win.open({ id: 'trash', title: 'PAPELERA — expedientes descartados', w: 540, h: 430 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `
    <p class="t-dim" style="font-size:.58rem;letter-spacing:.18em;margin:0 0 .9rem">
      ${DESCARTADOS.length} EXPEDIENTES SIN RELACIÓN CON EL 11-19 · NO BORRAR</p>
    <div class="msg-list" id="trashList"></div>`;

  const lista = win.body.querySelector('#trashList');
  for (const d of DESCARTADOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg';
    b.innerHTML = `<span class="de">${d.n}</span><span class="as"></span><span class="dt">descartado</span>`;
    b.querySelector('.as').textContent = d.t;
    b.addEventListener('click', () => abrirDescartado(d));
    lista.appendChild(b);
  }
}

async function abrirDescartado(d) {
  const win = Win.open({ id: 'trash' + d.n, title: `${d.n} — ${d.t}`, w: 500, h: 340 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';
  win.body.innerHTML = `<div class="msg-doc">
    <p class="from">EXPEDIENTE ${d.n} · DESCARTADO</p><h4>${d.t}</h4><div id="tb"></div></div>`;
  const tb = win.body.querySelector('#tb');
  for (const line of d.c) {
    const p = document.createElement('p');
    tb.appendChild(p);
    await typeInto(p, line, 7);
    await wait(40);
  }
}

/* ─────────────────────────────────────────────────────────────
   4 · EL COMPAÑERO DE MESA
   ───────────────────────────────────────────────────────────── */
const COMPA = 'BERNAL';
const CHARLA = [
  { t: 'buenas. ¿te han dado el 11-19?' },
  { t: 'lo tuve yo dos meses. no le saqué nada.',
    ops: [{ t: '¿qué miraste?', r: 'todo lo obvio. el banco, las cámaras, los tres. lo que no miré fue quién pagaba la caja.' },
          { t: '¿y por qué lo dejaste?', r: 'porque me mandaron a otra cosa. eso dijeron.' }] },
  { t: 'te aviso de una: el de sistemas mira los registros de acceso.' },
  { t: 'yo que tú no dejaría abierta la ventana del expediente si sales a comer.' },
  { t: 'ojo con los correos de "revisión externa". a mí me llegaron tres.',
    ops: [{ t: '¿y qué hiciste?', r: 'contestar. error mío. no lo repitas.' },
          { t: 'gracias por el aviso', r: 'nada. luego dirás que aquí nadie te avisa.' }] },
  { t: '¿has visto lo de la caja pagada once años? eso no lo hace un ladrón.' },
  { t: 'me voy a por café. ¿te traigo?',
    ops: [{ t: 'sí, gracias', r: 'te lo dejo en la mesa. está malísimo, aviso.' },
          { t: 'no, gracias', r: 'haces bien.' }] },
  { t: 'oye. ¿tú también has notado que el terminal va raro hoy?' },
  { t: 'me han cambiado la silla otra vez. era mía. tenía nombre y todo.' },
  { t: 'si llegas al final del expediente, avísame. tengo curiosidad desde hace dos años.' },
  { t: 'me voy. no te quedes hasta las tantas. lo digo por experiencia.' },
];

export const Compa = {
  i: store.get('chatIdx', 0),
  hist: store.get('chatHist', []),
  timer: 0,

  arrancar() {
    if (this.timer) return;
    this.timer = setInterval(() => this.siguiente(), rndInt(95, 190) * 1000);
    setTimeout(() => this.siguiente(), 38000);
  },

  siguiente() {
    if (this.i >= CHARLA.length) return;
    const m = CHARLA[this.i];
    this.i += 1;
    store.set('chatIdx', this.i);
    this.hist.push({ de: COMPA, t: m.t, ops: m.ops || null });
    store.set('chatHist', this.hist.slice(-40));
    Sound.blip(700, 0.05, 0.05);
    if (Win.isOpen('chat')) this.pintar();
    else toast(`${COMPA} TE HA ESCRITO`);
    document.querySelector('.icon[data-id="chat"]')?.classList.add('avisa');
  },

  abrir() {
    const win = Win.open({ id: 'chat', title: `MENSAJERÍA INTERNA — ${COMPA}`, w: 460, h: 440 });
    document.querySelector('.icon[data-id="chat"]')?.classList.remove('avisa');
    if (!win.body.dataset.built) {
      win.body.dataset.built = '1';
      win.body.innerHTML = `<div class="chat" id="chatCuerpo"></div>`;
      if (!this.hist.length) {
        this.hist.push({ de: COMPA, t: CHARLA[0].t, ops: null });
        this.i = Math.max(this.i, 1);
        store.set('chatIdx', this.i);
      }
    }
    this.pintar();
  },

  pintar() {
    const cuerpo = document.querySelector('#chatCuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';
    this.hist.forEach((m, idx) => {
      const b = document.createElement('div');
      b.className = 'chat-b ' + (m.de === COMPA ? 'ellos' : 'tu');
      b.innerHTML = `<span class="chat-de">${m.de}</span><p></p>`;
      b.querySelector('p').textContent = m.t;
      cuerpo.appendChild(b);

      // sólo el último mensaje admite respuesta
      if (m.ops && idx === this.hist.length - 1) {
        const zona = document.createElement('div');
        zona.className = 'chat-ops';
        m.ops.forEach((o) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chat-op';
          btn.textContent = o.t;
          btn.addEventListener('click', () => {
            this.hist.push({ de: 'TÚ', t: o.t, ops: null });
            this.hist.push({ de: COMPA, t: o.r, ops: null });
            store.set('chatHist', this.hist.slice(-40));
            Sound.blip(880, 0.05, 0.06);
            this.pintar();
          });
          zona.appendChild(btn);
        });
        cuerpo.appendChild(zona);
      }
    });
    cuerpo.scrollTop = cuerpo.scrollHeight;
  },
};

/* ─────────────────────────────────────────────────────────────
   5 · POST-ITS
   ───────────────────────────────────────────────────────────── */
export const Notas = {
  lista: store.get('notas', []),

  guardar() { store.set('notas', this.lista); },

  crear(txt = '') {
    this.lista.push({ id: 'n' + Date.now(), t: txt, x: rndInt(12, 60), y: rndInt(14, 55) });
    this.guardar();
    this.pintar();
    Sound.blip(920, 0.05, 0.06);
  },

  borrar(id) {
    this.lista = this.lista.filter((n) => n.id !== id);
    this.guardar();
    this.pintar();
    Sound.blip(380, 0.05, 0.05);
  },

  pintar() {
    const capa = $('notas');
    if (!capa) return;
    capa.innerHTML = '';
    for (const n of this.lista) {
      const el = document.createElement('div');
      el.className = 'nota';
      el.style.left = n.x + '%';
      el.style.top = n.y + '%';
      el.style.rotate = (Math.random() * 4 - 2).toFixed(1) + 'deg';
      el.innerHTML = `<button class="nota-x" type="button" aria-label="Quitar nota">×</button>
        <textarea placeholder="escribe aquí..." spellcheck="false"></textarea>`;
      const ta = el.querySelector('textarea');
      ta.value = n.t;
      ta.addEventListener('input', () => {
        n.t = ta.value;
        this.guardar();
      });
      el.querySelector('.nota-x').addEventListener('click', () => this.borrar(n.id));
      capa.appendChild(el);
    }
  },
};

export function openNotas() {
  if (Notas.lista.length >= 6) { toast('YA TIENE SEIS NOTAS PEGADAS'); return; }
  Notas.crear();
  toast('NOTA PEGADA EN EL ESCRITORIO');
}
