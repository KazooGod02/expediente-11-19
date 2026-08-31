/* ════════════════════════════════════════════════════════════
   eventos.js — lo que pasa sin que lo pidas

   · Llamadas del departamento con opciones cerradas
   · Anuncios emergentes del intranet
   · Un hackeo que hay que purgar
   · Y lo que se queda dentro si fallas la purga
   ════════════════════════════════════════════════════════════ */
import { $, wait, pick, rndInt, store, Sound, Win, toast, notify, typeInto } from './core.js';
import { openPurga } from './purga.js';

/* ─────────────────────────────────────────────────────────────
   1 · LLAMADAS
   ───────────────────────────────────────────────────────────── */
const LLAMADAS = [
  {
    id: 'l1', de: 'CENTRALITA', asunto: 'Un vecino del mirador',
    txt: ['Agente, tengo a un señor al teléfono. Dice que vive frente al mirador y que lleva '
        + 'tres noches viendo luces raras. Dice que son "señales".',
        '¿Se lo paso o le digo que llame mañana?'],
    ops: [
      { t: 'Pásemelo ahora', ok: 1, r: 'Habla veinte minutos. De los veinte, un dato: las luces siempre empiezan a la misma hora. Lo anoto.' },
      { t: 'Que llame mañana', ok: 0, r: 'No volvió a llamar. Nunca vuelven a llamar.' },
      { t: 'Que lo atienda patrulla', ok: 0, r: 'Patrulla le tomó declaración y la archivó en el cajón equivocado. La recuperaremos en tres semanas.' },
    ],
  },
  {
    id: 'l2', de: 'ARCHIVO', asunto: 'Petición de material',
    txt: ['Nos piden desde arriba el expediente completo del 11-19 para "revisión externa".',
        'No consta quién lo pide. Sólo el sello.',
        '¿Se lo mandamos?'],
    ops: [
      { t: 'Mándelo, es una orden', ok: 0, r: 'Lo mandamos. A los dos días nos devolvieron una copia con tres páginas menos. Nadie sabe cuáles.' },
      { t: 'Pida el nombre primero', ok: 1, r: 'Pedimos el nombre. La petición se retiró sola en cuatro horas. Interesante.' },
      { t: 'Mande una copia incompleta', ok: 1, r: 'Mandamos lo que ya era público. No protestaron. Eso dice bastante.' },
    ],
  },
  {
    id: 'l3', de: 'LABORATORIO', asunto: 'Presupuesto',
    txt: ['Podemos hacer una prueba más sobre el resguardo de peaje, pero se come el presupuesto del trimestre.',
        'O eso, o los análisis de los otros cuatro casos abiertos.'],
    ops: [
      { t: 'Adelante con el resguardo', ok: 1, r: 'Salió tinta de bolígrafo de al menos dos manos distintas. Dos personas escribieron esas cifras.' },
      { t: 'Guarde el presupuesto', ok: 0, r: 'Sensato. Y ahora nunca sabremos cuántas manos escribieron eso.' },
    ],
  },
  {
    id: 'l4', de: 'PRENSA', asunto: 'Un periodista pregunta',
    txt: ['Un periodista local ha atado cabos: sabe que hubo un robo sin denuncia.',
        'Quiere una declaración. Si no se la damos, publica igual.'],
    ops: [
      { t: 'Sin comentarios', ok: 0, r: 'Publicó "la policía guarda silencio". Ahora tenemos a tres curiosos rondando la sucursal.' },
      { t: 'Confirme lo mínimo', ok: 1, r: 'Publicó una nota de seis líneas y se olvidó del asunto. A veces basta con no esconderse.' },
      { t: 'Pídale lo que sabe él', ok: 1, r: 'Nos dio un nombre que no teníamos. Los periodistas trabajan gratis si les dejas.' },
    ],
  },
  {
    id: 'l5', de: 'SISTEMAS', asunto: 'Su terminal',
    txt: ['Su equipo ha hecho 400 peticiones al archivo central esta semana.',
        'La media de la división es 30.',
        '¿Le pasa algo, agente?'],
    ops: [
      { t: 'Estoy trabajando el caso', ok: 1, r: 'Lo anotó y colgó. Media hora después nos subieron la cuota. Gracias, sistemas.' },
      { t: 'Debe ser un error', ok: 0, r: 'Le pusieron un monitor al terminal. Ahora hay alguien mirando lo que mira usted.' },
    ],
  },
  {
    id: 'l6', de: 'CENTRAL', asunto: 'Horas extra',
    txt: ['Lleva tres semanas fichando salidas después de medianoche.',
        'Recursos Humanos pregunta. Yo también, pero por otra razón.'],
    ops: [
      { t: 'Me voy ya a casa', ok: 1, r: 'Bien. Mañana verá el expediente con otros ojos. Suele funcionar.' },
      { t: 'Un rato más', ok: 0, r: 'Lo suponía. Le he dejado café en la máquina. Sabe a moneda, pero es café.' },
    ],
  },
  {
    id: 'l7', de: 'TRÁFICO', asunto: 'Cámara de peaje',
    txt: ['Encontramos una cámara de peaje que graba la noche del 11-19.',
        'Está a 40 km del banco y el archivo pesa 6 GB. Tardaríamos días en revisarla entera.'],
    ops: [
      { t: 'Revísenla entera', ok: 0, r: 'Cuatro días de trabajo para descubrir que el coche no pasó por ahí. Descartar también es avanzar, dicen.' },
      { t: 'Sólo la franja 03:40 a 04:10', ok: 1, r: 'En treinta minutos teníamos el resultado: pasó a las 03:58 y no había nadie detrás de ellos.' },
    ],
  },
  {
    id: 'l8', de: '—', asunto: 'llamada sin origen',
    txt: ['(silencio)',
        '(alguien respira al otro lado)',
        '«deje de mirar la cinta. no está buscando lo que cree.»',
        '(cuelgan)'],
    ops: [
      { t: 'Rastrear la llamada', ok: 0, r: 'Cabina. Sin cámaras. Por supuesto.' },
      { t: 'No hacer nada', ok: 1, r: 'No hizo nada. Y a los dos días volvieron a llamar. Eso es más de lo que consigue una orden judicial.' },
      { t: 'Reportarlo a Central', ok: 0, r: 'Central abrió una incidencia y la cerró el mismo día. "Sin relevancia para el caso".' },
    ],
  },
  {
    id: 'l9', de: 'BANCO MERIDIANO', asunto: 'Un abogado, otra vez',
    txt: ['El banco insiste: quieren que el 11-19 se cierre como "incidente sin daño patrimonial".',
        'Ofrecen colaborar en todo lo demás si firmamos eso.'],
    ops: [
      { t: 'Ni hablar', ok: 1, r: 'Dejaron de colaborar en todo. Pero al menos el expediente sigue diciendo la verdad.' },
      { t: 'Estudiarlo', ok: 0, r: 'Mientras lo estudiábamos nos mandaron los registros de la 419. Incompletos, pero llegaron.' },
    ],
  },
  {
    id: 'l10', de: 'CENTRALITA', asunto: 'Su propia extensión',
    txt: ['Agente, alguien ha llamado a su extensión desde dentro del edificio.',
        'La extensión de origen es la suya.',
        'Ha sonado su teléfono desde su teléfono. Yo sólo le paso el aviso.'],
    ops: [
      { t: 'Revisar la centralita', ok: 1, r: 'Un fallo del conmutador, dicen. Lo dicen sin mirarme a los ojos.' },
      { t: 'Ignorarlo', ok: 1, r: 'Lo ignoró. Fue lo más sano que hizo en toda la semana.' },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   2 · ANUNCIOS
   ───────────────────────────────────────────────────────────── */
const ANUNCIOS = [
  { t: '¡FELICIDADES, AGENTE!', b: 'Es usted el visitante <b>1.000.000</b> del INTRANET K.P.D.<br>Reclame su placa dorada.', cta: 'RECLAMAR' },
  { t: 'SOLTERAS EN SU COMISARÍA', b: 'Hay <b>3 archiveras</b> a menos de 40 metros de su mesa.<br>Ninguna quiere hablar con usted.', cta: 'VER PERFILES' },
  { t: '¿TERMINAL LENTO?', b: 'Descargue <b>K.P.D. OPTIMIZER PRO</b> y acelere su equipo un <b>400%</b>.<br><small>No afiliado al Kazoo Police Department.</small>', cta: 'DESCARGAR', peligro: 1 },
  { t: 'CURSO DE CRIPTOGRAFÍA', b: 'Aprenda a romper <b>AES-256</b> en un fin de semana.<br><small>Resultados no garantizados. Ni posibles.</small>', cta: 'APUNTARME' },
  { t: 'ANALIZADOR DE EXPEDIENTES', b: 'Resuelve casos abiertos <b>automáticamente</b>.<br>Ya lo usan 0 departamentos.', cta: 'PROBAR GRATIS', peligro: 1 },
  { t: 'AVISO DE LA MÁQUINA DE CAFÉ', b: 'Su saldo es de <b>0,00 €</b>.<br>Lleva 14 cafés a deber.', cta: 'PAGAR LUEGO' },
];

/* ─────────────────────────────────────────────────────────────
   estado
   ───────────────────────────────────────────────────────────── */
export const Eventos = {
  api: null,
  virus: store.get('virus', false),
  vistas: new Set(store.get('llamadasVistas', [])),
  timers: [],
  arrancado: false,

  init(api) { this.api = api; },

  arrancar() {
    if (this.arrancado) return;
    this.arrancado = true;

    // ritmo suelto: ni una cosa detrás de otra, ni desierto
    const ciclo = (fn, min, max) => {
      const t = setTimeout(() => { fn(); ciclo(fn, min, max); }, rndInt(min, max) * 1000);
      this.timers.push(t);
    };
    ciclo(() => this.lanzarLlamada(), 150, 320);
    ciclo(() => this.lanzarAnuncio(), 110, 240);

    // el hackeo se intenta una sola vez por sesión, y no al principio
    if (!this.virus) {
      this.timers.push(setTimeout(() => this.lanzarHackeo(), rndInt(280, 460) * 1000));
    } else {
      setTimeout(() => this.activarVirus(), 3000);
    }
  },

  /* ── llamada ── */
  lanzarLlamada(forzada) {
    const libres = LLAMADAS.filter((l) => !this.vistas.has(l.id));
    const l = forzada || (libres.length ? pick(libres) : pick(LLAMADAS));
    notify('LLAMADA · ' + l.de, l.asunto, () => this.abrirLlamada(l));
    Sound.blip(660, 0.1, 0.07);
    setTimeout(() => Sound.blip(660, 0.1, 0.07), 420);
  },

  async abrirLlamada(l) {
    this.vistas.add(l.id);
    store.set('llamadasVistas', [...this.vistas]);

    const win = Win.open({ id: 'call' + l.id, title: `LLAMADA — ${l.de}`, w: 480, h: 400 });
    if (win.body.dataset.built) return;
    win.body.dataset.built = '1';

    win.body.innerHTML = `<div class="call">
      <p class="call-de">LÍNEA INTERNA · ${l.de}</p>
      <h4>${l.asunto}</h4>
      <div id="callTxt"></div>
      <div class="call-ops" id="callOps"></div>
      <div id="callRes"></div>
    </div>`;

    const cont = win.body.querySelector('#callTxt');
    for (const line of l.txt) {
      const p = document.createElement('p');
      cont.appendChild(p);
      await typeInto(p, line, 7);
      await wait(60);
    }

    const ops = win.body.querySelector('#callOps');
    l.ops.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'call-op';
      b.type = 'button';
      b.textContent = `${i + 1}. ${o.t}`;
      b.addEventListener('click', async () => {
        ops.querySelectorAll('.call-op').forEach((x) => { x.disabled = true; });
        b.classList.add('elegida');
        Sound.blip(o.ok ? 900 : 420, 0.07, 0.07);
        const res = win.body.querySelector('#callRes');
        res.innerHTML = `<p class="call-res ${o.ok ? 'bien' : 'mal'}"></p>`;
        await typeInto(res.querySelector('p'), o.r, 7);
        this.api?.registrarLlamada?.(l, o);
      });
      ops.appendChild(b);
    });
  },

  /* ── anuncio ── */
  lanzarAnuncio() {
    const a = pick(ANUNCIOS);
    const wrap = $('popups');
    if (!wrap || wrap.children.length >= 2) return;

    const el = document.createElement('div');
    el.className = 'popup';
    el.style.left = rndInt(8, 55) + '%';
    el.style.top = rndInt(15, 60) + '%';
    el.innerHTML = `
      <div class="popup-bar"><span>anuncio.k.p.d</span><button class="popup-x" type="button" aria-label="Cerrar">×</button></div>
      <div class="popup-body"><h5>${a.t}</h5><p>${a.b}</p>
        <button class="popup-cta" type="button">${a.cta}</button></div>`;
    wrap.appendChild(el);
    Sound.blip(520, 0.05, 0.05);

    const cerrar = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.querySelector('.popup-x').addEventListener('click', cerrar);
    el.querySelector('.popup-cta').addEventListener('click', () => {
      cerrar();
      if (a.peligro && !this.virus) {
        toast('ESO NO DEBERÍA HABERSE PULSADO');
        setTimeout(() => this.lanzarHackeo(), 1800);
      } else {
        toast('NO HA PASADO NADA. AFORTUNADAMENTE.');
      }
    });
    setTimeout(() => { if (el.isConnected) cerrar(); }, 26000);
  },

  /* ── hackeo ── */
  lanzarHackeo() {
    if (this.virus || $('hack')) return;
    const capa = document.createElement('div');
    capa.id = 'hack';
    capa.className = 'hack';
    capa.innerHTML = `<div class="hack-lluvia"></div>
      <div class="hack-txt">
        <p class="hack-t">INTRUSIÓN EN CURSO</p>
        <p class="hack-b">Un proceso ajeno se está copiando por la memoria del terminal.</p>
        <p class="hack-b">Purgue los sectores antes de que termine.</p>
      </div>`;
    document.body.appendChild(capa);
    Sound.buzz();
    for (let i = 0; i < 5; i++) setTimeout(() => Sound.blip(200 + i * 90, 0.09, 0.08), i * 130);

    setTimeout(() => {
      openPurga((gano) => {
        capa.classList.add('out');
        setTimeout(() => capa.remove(), 500);
        if (gano) {
          toast('SISTEMA LIMPIO');
          this.api?.consola?.('>> PURGA COMPLETADA. MEMORIA LIMPIA.', 't-ok');
        } else {
          this.activarVirus();
        }
      }, 'INTRUSIÓN DETECTADA');
    }, 2600);
  },

  /* ── el bicho ── */
  activarVirus() {
    if ($('bicho')) return;
    this.virus = true;
    store.set('virus', true);
    this.api?.consola?.('>> ALGO SE HA QUEDADO EN EL SISTEMA. ESCRIBA ANTIVIRUS.', 't-warn');
    toast('ALGO SE HA QUEDADO DENTRO');

    const el = document.createElement('div');
    el.id = 'bicho';
    el.className = 'bicho';
    el.innerHTML = `<div class="bicho-globo" id="bichoGlobo"></div>
      <div class="bicho-cara">
        <span class="ojo"></span><span class="ojo"></span>
        <span class="boca"></span>
      </div>`;
    document.body.appendChild(el);

    let x = window.innerWidth * 0.6, y = window.innerHeight * 0.55;
    let vx = 1.1, vy = 0.8;
    const globo = el.querySelector('#bichoGlobo');

    const FRASES = [
      '¡hola, agente!',
      '¿te ayudo con el expediente?',
      'he leído tu correo',
      'la 419 estaba vacía, ¿sabes?',
      'yo también quiero ver la cinta',
      'tu contraseña es débil',
      '¿por qué no descansas?',
      'no me puedes cerrar',
      'ANTIVIRUS. lo digo por decir.',
      'te faltan lecturas',
    ];

    const andar = setInterval(() => {
      if (!el.isConnected) return clearInterval(andar);
      x += vx; y += vy;
      if (x < 10 || x > window.innerWidth - 90) vx *= -1;
      if (y < 70 || y > window.innerHeight - 120) vy *= -1;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }, 30);

    const hablar = setInterval(() => {
      if (!el.isConnected) return clearInterval(hablar);
      globo.textContent = pick(FRASES);
      globo.classList.add('on');
      Sound.blip(rndInt(700, 1400), 0.05, 0.05);
      setTimeout(() => globo.classList.remove('on'), 3600);
    }, 11000);

    // travesuras: molesta, pero nunca deja el caso sin salida
    const fastidiar = setInterval(() => {
      if (!el.isConnected) return clearInterval(fastidiar);
      const abiertas = Win.list().filter((w) => !['term', 'purga'].includes(w.id));
      if (abiertas.length && Math.random() < 0.5) {
        Win.minimize(pick(abiertas).id);
        toast('ALGO HA MINIMIZADO UNA VENTANA');
      } else {
        this.lanzarAnuncio();
      }
    }, 34000);

    this._virusTimers = [andar, hablar, fastidiar];
    setTimeout(() => { globo.textContent = FRASES[0]; globo.classList.add('on'); }, 600);
  },

  quitarVirus() {
    this.virus = false;
    store.set('virus', false);
    (this._virusTimers || []).forEach(clearInterval);
    $('bicho')?.remove();
  },

  /** Comando ANTIVIRUS: vuelve a lanzar la purga. */
  antivirus() {
    if (!this.virus) { toast('EL SISTEMA ESTÁ LIMPIO'); return false; }
    openPurga((gano) => {
      if (gano) {
        this.quitarVirus();
        toast('SISTEMA LIMPIO');
        this.api?.consola?.('>> BICHO ELIMINADO. MEMORIA LIMPIA.', 't-ok');
      } else {
        this.api?.consola?.('>> LA PURGA HA FALLADO. SIGUE AHÍ.', 't-warn');
      }
    }, 'PURGA MANUAL');
    return true;
  },
};
