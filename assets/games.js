/* ════════════════════════════════════════════════════════════
   games.js — los cuatro ejercicios de campo
   Cada uno entrega una lectura distinta al superarse.
   ════════════════════════════════════════════════════════════ */
import { wait, rnd, rndInt, pick, Sound, Win, toast, REDUCED } from './core.js';

/* ═════════════════════════════════════════════════════════════
   1 · TRIANGULACIÓN            comando: TRIANGULAR
   Tres fijaciones seguidas. Mientras mueves el cursor, cada
   repetidor te dice a qué distancia estás: se juega a oído fino,
   no a adivinar.
   ═════════════════════════════════════════════════════════════ */
export function openTriangulacion(ctx) {
  const win = Win.open({ id: 'tri', title: 'TRIANGULACIÓN DE SEÑAL — ejercicio 01', w: 580, h: 660 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const RONDAS = 3;
  const done = ctx.hasClave('lat');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 01 · TRIANGULACIÓN</h4>
      <p class="brief">
        Tres repetidores captaron la señal y cada uno informa a qué distancia estaba el emisor.
        Mueve el cursor por el plano: cada repetidor te dirá <b>tu</b> distancia en tiempo real.
        Cuando las tres coincidan con las de arriba, marca el punto.
        Hay que fijar <b>${RONDAS}</b> posiciones seguidas.
      </p>
      <div class="tri-prog" id="triProg"></div>
      <div class="tri-reads" id="triReads"></div>
      <canvas class="tri-cv" id="triCv" width="540" height="380"></canvas>
      <div class="row">
        <button class="btn ghost" id="triRadios" type="button">TRAZAR RADIOS</button>
        <span class="t-dim" id="triTries">intentos en esta ronda: 0</span>
      </div>
      <div id="triOut"></div>
    </div>`;

  const q = (s) => win.body.querySelector(s);
  const cv = q('#triCv'), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  let towers = [], target = null, tries = 0, radios = false, guess = null;
  let ronda = 0, solved = done, cursor = null;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function prog() {
    q('#triProg').innerHTML = Array.from({ length: RONDAS },
      (_, i) => `<i class="${i < ronda || solved ? 'on' : ''}"></i>`).join('');
  }

  function reads() {
    q('#triReads').innerHTML = towers.map((t) => {
      const objetivo = dist(t, target);
      const mia = cursor ? dist(t, cursor) : null;
      const cerca = mia !== null && Math.abs(mia - objetivo) < 14;
      return `<div class="tri-read ${cerca ? 'hot' : ''}">
        <b>${objetivo.toFixed(1)}</b>
        <span>${t.n} · TÚ: ${mia === null ? '—' : mia.toFixed(1)}</span>
      </div>`;
    }).join('');
  }

  function nuevaRonda() {
    towers = [
      { x: rnd(55, 175), y: rnd(55, 150), n: 'R-1' },
      { x: rnd(365, 485), y: rnd(65, 165), n: 'R-2' },
      { x: rnd(190, 350), y: rnd(260, 330), n: 'R-3' },
    ];
    target = { x: rnd(120, 420), y: rnd(115, 270) };
    tries = 0; radios = false; guess = null; cursor = null;
    q('#triTries').textContent = 'intentos en esta ronda: 0';
    q('#triOut').innerHTML = '';
    prog(); reads(); draw();
  }

  function draw() {
    cx.clearRect(0, 0, W, H);

    cx.strokeStyle = 'rgba(140,130,175,.09)';
    cx.lineWidth = 1;
    for (let x = 0; x <= W; x += 45) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = 0; y <= H; y += 45) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }

    if (radios) {
      cx.strokeStyle = 'rgba(201,163,255,.32)';
      for (const t of towers) {
        cx.beginPath(); cx.arc(t.x, t.y, dist(t, target), 0, Math.PI * 2); cx.stroke();
      }
    }

    // círculo de tu distancia actual: la ayuda visual que lo hace intuitivo
    if (cursor && !solved) {
      for (const t of towers) {
        const d = dist(t, cursor);
        const err = Math.abs(d - dist(t, target));
        cx.strokeStyle = err < 14 ? 'rgba(125,240,200,.55)' : 'rgba(140,130,175,.16)';
        cx.setLineDash([4, 6]);
        cx.beginPath(); cx.arc(t.x, t.y, d, 0, Math.PI * 2); cx.stroke();
        cx.setLineDash([]);
      }
    }

    for (const t of towers) {
      cx.fillStyle = '#c9a3ff';
      cx.beginPath(); cx.arc(t.x, t.y, 4, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = 'rgba(201,163,255,.45)';
      cx.beginPath(); cx.arc(t.x, t.y, 10, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = '#7d7695';
      cx.font = '10px "Share Tech Mono", monospace';
      cx.fillText(t.n, t.x + 14, t.y + 3);
    }

    if (cursor && !solved) {
      cx.strokeStyle = 'rgba(255,122,208,.5)';
      cx.beginPath(); cx.moveTo(cursor.x, 0); cx.lineTo(cursor.x, H); cx.stroke();
      cx.beginPath(); cx.moveTo(0, cursor.y); cx.lineTo(W, cursor.y); cx.stroke();
    }

    if (guess) {
      cx.strokeStyle = '#ff5f7e'; cx.lineWidth = 1.8;
      cx.beginPath(); cx.moveTo(guess.x - 8, guess.y); cx.lineTo(guess.x + 8, guess.y); cx.stroke();
      cx.beginPath(); cx.moveTo(guess.x, guess.y - 8); cx.lineTo(guess.x, guess.y + 8); cx.stroke();
      cx.lineWidth = 1;
    }
  }

  const toCv = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  cv.addEventListener('pointermove', (e) => {
    if (solved) return;
    cursor = toCv(e); reads(); draw();
  });
  cv.addEventListener('pointerleave', () => { if (!solved) { cursor = null; reads(); draw(); } });

  cv.addEventListener('pointerdown', (e) => {
    if (solved) return;
    guess = cursor = toCv(e);
    tries += 1;
    q('#triTries').textContent = 'intentos en esta ronda: ' + tries;
    const d = dist(guess, target);
    const out = q('#triOut');

    if (d <= 18) {
      ronda += 1;
      Sound.blip(1000, 0.1, 0.09);
      prog();
      if (ronda >= RONDAS) {
        solved = true; cursor = null; radios = true; draw();
        Sound.fanfare();
        out.innerHTML = `<div class="won">TRES POSICIONES FIJADAS.<br>
          Coordenada recuperada del resguardo:<br><b>${ctx.claves.lat.value}</b></div>`;
        ctx.grantClave('lat');
      } else {
        out.innerHTML = `<p class="t-ok">Fijada ${ronda} de ${RONDAS}. Cargando la siguiente lectura...</p>`;
        setTimeout(nuevaRonda, 1100);
      }
      return;
    }

    Sound.buzz();
    draw(); reads();
    out.innerHTML = `<p class="lost">Sin coincidencia · ${d.toFixed(0)} unidades de desvío.</p>`;
    if (tries >= 3 && !radios) {
      radios = true; draw();
      out.innerHTML += `<p class="t-dim">Se trazan los radios para ayudarte.</p>`;
    }
  });

  q('#triRadios').addEventListener('click', () => { radios = !radios; draw(); Sound.blip(620, 0.04); });

  nuevaRonda();
  if (done) {
    solved = true; ronda = RONDAS; prog();
    q('#triOut').innerHTML =
      `<div class="won">EJERCICIO SUPERADO.<br>Coordenada en tu poder:<br><b>${ctx.claves.lat.value}</b></div>`;
  }
}

/* ═════════════════════════════════════════════════════════════
   2 · CAJA 419                 comando: CAJA 419
   Cuatro dígitos. La cerradura dice cuántos aciertas y cuántos
   caen en su sitio. Se puede tachar dígitos descartados con el
   botón derecho: llevar la cuenta a mano es media partida.
   ═════════════════════════════════════════════════════════════ */
export function openCaja(ctx) {
  const win = Win.open({ id: 'caja', title: 'CAJA 419 — simulador de cerradura', w: 500, h: 660 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const MAX = 12;
  const done = ctx.hasClave('lon');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 02 · CERRADURA ROTATORIA</h4>
      <p class="brief">
        Cuatro dígitos del 0 al 9, con repeticiones posibles.
        Tras cada intento la cerradura revela cuántos dígitos son correctos
        y cuántos, además, están en su posición.
        Puedes escribir con el teclado. <b>Clic derecho</b> sobre un número lo tacha
        para llevar la cuenta de lo descartado.
      </p>
      <div class="safe-display" id="safeDisp"></div>
      <div class="safe-pad" id="safePad"></div>
      <div class="row">
        <button class="btn hot" id="safeGo" type="button">PROBAR</button>
        <button class="btn ghost" id="safeDel" type="button">BORRAR</button>
        <span class="t-dim" id="safeLeft">${MAX} intentos</span>
      </div>
      <div class="safe-log" id="safeLog"></div>
      <div id="safeOut"></div>
    </div>`;

  const q = (s) => win.body.querySelector(s);
  const disp = q('#safeDisp'), log = q('#safeLog'), out = q('#safeOut');

  const secret = Array.from({ length: 4 }, () => rndInt(0, 9));
  let entry = [], left = MAX, solved = done;

  function renderDisp() {
    disp.innerHTML = Array.from({ length: 4 }, (_, i) =>
      `<div class="safe-digit ${i === entry.length && !solved ? 'active' : ''} ${entry[i] !== undefined ? 'set' : ''}">${entry[i] ?? '·'}</div>`
    ).join('');
  }

  q('#safePad').innerHTML = Array.from({ length: 10 },
    (_, d) => `<button class="safe-key" type="button" data-d="${d}">${d}</button>`).join('');

  const push = (d) => {
    if (solved || entry.length >= 4) return;
    entry.push(d);
    Sound.blip(480 + d * 42, 0.04, 0.06);
    renderDisp();
  };
  const back = () => { if (solved) return; entry.pop(); Sound.blip(300, 0.04, 0.05); renderDisp(); };

  q('#safePad').addEventListener('click', (e) => {
    const b = e.target.closest('.safe-key');
    if (b) push(Number(b.dataset.d));
  });
  q('#safePad').addEventListener('contextmenu', (e) => {
    const b = e.target.closest('.safe-key');
    if (!b) return;
    e.preventDefault();
    b.classList.toggle('out');
    Sound.blip(b.classList.contains('out') ? 260 : 620, 0.04, 0.05);
  });

  /** Exactos y parciales, sin contar dos veces el mismo dígito. */
  function evaluate(guess) {
    const s = [...secret], g = [...guess];
    let exact = 0;
    for (let i = 3; i >= 0; i--) if (g[i] === s[i]) { exact++; s.splice(i, 1); g.splice(i, 1); }
    let partial = 0;
    for (const d of g) { const k = s.indexOf(d); if (k !== -1) { partial++; s.splice(k, 1); } }
    return { exact, partial };
  }

  function probar() {
    if (solved) return;
    if (entry.length < 4) { toast('FALTAN DÍGITOS'); Sound.buzz(); return; }

    const guess = [...entry];
    const { exact, partial } = evaluate(guess);
    left -= 1;
    q('#safeLeft').textContent = `${left} intentos`;

    const row = document.createElement('div');
    row.className = 'safe-try';
    row.innerHTML = `<span class="cmb">${guess.join('')}</span>
      <span class="fb"><span class="ex">${exact} en sitio</span> · <span class="pa">${partial} sueltos</span></span>`;
    log.prepend(row);

    entry = []; renderDisp();

    if (exact === 4) {
      solved = true;
      Sound.fanfare();
      out.innerHTML = `<div class="won">CERRADURA ABIERTA en ${MAX - left} ${MAX - left === 1 ? 'intento' : 'intentos'}.<br>
        Dentro, escrito a mano:<br><b>${ctx.claves.lon.value}</b></div>`;
      ctx.grantClave('lon');
      return;
    }

    Sound.blip(exact ? 720 : 300, 0.06, 0.06);

    if (left <= 0) {
      Sound.buzz();
      solved = true;
      out.innerHTML = `<p class="lost">Bloqueo por exceso de intentos. La combinación era ${secret.join('')}.</p>
        <p class="t-dim">Cierra y vuelve a abrir el simulador para una combinación nueva.</p>`;
    }
  }

  q('#safeGo').addEventListener('click', probar);
  q('#safeDel').addEventListener('click', back);

  win.root.addEventListener('keydown', (e) => {
    if (solved) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); push(Number(e.key)); }
    else if (e.key === 'Backspace') { e.preventDefault(); back(); }
    else if (e.key === 'Enter') { e.preventDefault(); probar(); }
  });
  win.root.tabIndex = -1;
  setTimeout(() => win.root.focus(), 60);

  renderDisp();
  if (done) {
    out.innerHTML = `<div class="won">EJERCICIO SUPERADO.<br>Anotación en tu poder:<br><b>${ctx.claves.lon.value}</b></div>`;
  }
}

/* ═════════════════════════════════════════════════════════════
   3 · SECUENCIA                comando: SECUENCIA
   Once tonos. Se puede pedir repetición sin penalización y
   quedan tres reintentos antes de volver al principio.
   ═════════════════════════════════════════════════════════════ */
export function openSecuencia(ctx) {
  const win = Win.open({ id: 'seq', title: 'SECUENCIA INTERCEPTADA — reproductor', w: 460, h: 600 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const GOAL = 11;
  const FREQS = [261.63, 349.23, 440.0, 587.33];
  const NAMES = ['DO', 'FA', 'LA', 'RE'];
  const done = ctx.hasClave('hora');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 03 · RESPUESTA POR TONOS</h4>
      <p class="brief">
        El emisor lanza una secuencia y espera que la devuelvas entera.
        Cada acierto añade un tono; hay que llegar a <b>${GOAL}</b>.
        <b>REPETIR</b> no penaliza: úsalo todo lo que quieras.
        Tienes <b>tres</b> reintentos antes de volver al principio.
        Sube el volumen: se distinguen mejor de oído que de vista.
      </p>
      <div class="seq-meter" id="seqMeter"></div>
      <div class="seq-pads" id="seqPads"></div>
      <div class="row">
        <button class="btn hot" id="seqStart" type="button">EMITIR</button>
        <button class="btn ghost" id="seqAgain" type="button" disabled>REPETIR</button>
        <span class="t-dim" id="seqLen">longitud 0 / ${GOAL}</span>
        <span class="t-dim" id="seqLives">reintentos ●●●</span>
      </div>
      <div id="seqOut"></div>
    </div>`;

  const q = (s) => win.body.querySelector(s);
  const padsEl = q('#seqPads'), out = q('#seqOut');
  const btnStart = q('#seqStart'), btnAgain = q('#seqAgain');

  padsEl.innerHTML = NAMES.map((n, i) =>
    `<button class="seq-pad" type="button" data-i="${i}" disabled>${n}</button>`).join('');
  const pads = [...padsEl.querySelectorAll('.seq-pad')];

  q('#seqMeter').innerHTML = Array.from({ length: GOAL }, () => '<i></i>').join('');
  const bars = [...q('#seqMeter').querySelectorAll('i')];

  let seq = [], input = 0, playing = false, solved = done, lives = 3;

  const setEnabled = (v) => pads.forEach((p) => { p.disabled = !v; });
  const setLives = () => {
    q('#seqLives').textContent = 'reintentos ' + '●'.repeat(Math.max(0, lives)) + '○'.repeat(3 - Math.max(0, lives));
  };
  const updateMeter = () => {
    bars.forEach((b, i) => b.classList.toggle('on', i < seq.length));
    q('#seqLen').textContent = `longitud ${seq.length} / ${GOAL}`;
  };

  async function flash(i, ms = 330) {
    pads[i].classList.add('lit');
    Sound.tone(FREQS[i], ms / 1000);
    await wait(ms);
    pads[i].classList.remove('lit');
    await wait(REDUCED ? 40 : 105);
  }

  async function playSeq() {
    playing = true; setEnabled(false); btnAgain.disabled = true;
    await wait(320);
    for (const i of seq) await flash(i);
    playing = false; setEnabled(true); btnAgain.disabled = false;
    input = 0;
  }

  async function nextRound() { seq.push(rndInt(0, 3)); updateMeter(); await playSeq(); }

  padsEl.addEventListener('click', async (e) => {
    const b = e.target.closest('.seq-pad');
    if (!b || playing || solved) return;
    const i = Number(b.dataset.i);
    b.classList.add('lit');
    Sound.tone(FREQS[i], 0.22);
    setTimeout(() => b.classList.remove('lit'), 180);

    if (seq[input] !== i) {
      Sound.buzz();
      setEnabled(false); btnAgain.disabled = true;
      lives -= 1; setLives();
      if (lives > 0) {
        out.innerHTML = `<p class="lost">Error en la posición ${input + 1}.
          El emisor repite la misma secuencia. Quedan ${lives}.</p>`;
        input = 0;
        await wait(850);
        playSeq();
        return;
      }
      out.innerHTML = `<p class="lost">Tercer error. Hay que empezar de cero. Vuelve a EMITIR.</p>`;
      seq = []; input = 0; lives = 3; setLives(); updateMeter();
      btnStart.disabled = false;
      return;
    }

    input += 1;
    if (input === seq.length) {
      if (seq.length >= GOAL) {
        solved = true; setEnabled(false); btnAgain.disabled = true;
        Sound.fanfare();
        out.innerHTML = `<div class="won">SECUENCIA DEVUELTA COMPLETA.<br>
          El emisor contesta una sola vez, con una hora:<br><b>${ctx.claves.hora.value}</b></div>`;
        ctx.grantClave('hora');
        return;
      }
      out.innerHTML = `<p class="t-ok">Correcto. El emisor añade un tono.</p>`;
      setEnabled(false);
      await wait(560);
      nextRound();
    }
  });

  btnStart.addEventListener('click', () => {
    if (solved) { toast('EJERCICIO YA SUPERADO'); return; }
    seq = []; input = 0; lives = 3; setLives(); out.innerHTML = '';
    btnStart.disabled = true;
    nextRound();
  });
  btnAgain.addEventListener('click', () => { if (!playing && !solved && seq.length) playSeq(); });

  updateMeter(); setLives();
  if (done) {
    setEnabled(false); btnStart.disabled = true;
    out.innerHTML = `<div class="won">EJERCICIO SUPERADO.<br>Hora en tu poder:<br><b>${ctx.claves.hora.value}</b></div>`;
  }
}

/* ═════════════════════════════════════════════════════════════
   4 · LA NOTA DEL MIRADOR      comando: DESCIFRAR
   Cifrado de sustitución: cada letra es siempre otra.
   Se regalan tres letras y hay tres pistas más si hacen falta.
   ═════════════════════════════════════════════════════════════ */
const NOTA = 'DEJAREMOS UNA CINTA ANTES DE LA FECHA';
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function openDescifrar(ctx) {
  const win = Win.open({ id: 'cip', title: 'NOTA DEL MIRADOR — descifrado', w: 560, h: 620 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const done = ctx.hasClave('fecha');

  // clave de sustitución: ninguna letra se queda en su sitio
  let mapa;
  do {
    const dst = [...ABC].sort(() => Math.random() - 0.5);
    mapa = {};
    [...ABC].forEach((c, i) => { mapa[c] = dst[i]; });
  } while ([...ABC].some((c) => mapa[c] === c));

  const cifrada = [...NOTA].map((c) => (c === ' ' ? ' ' : mapa[c])).join('');
  const usadas = [...new Set(cifrada.replace(/ /g, ''))].sort();
  const correcta = {};                       // cifrada -> clara
  for (const c of ABC) correcta[mapa[c]] = c;

  const puesto = {};                         // cifrada -> lo que ha puesto el agente
  let sel = null, pistas = 3;

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 04 · SUSTITUCIÓN SIMPLE</h4>
      <p class="brief">
        Cada letra de la nota es siempre la misma letra cambiada.
        Pulsa una letra del cifrado y luego la letra real que crees que es.
        Te regalamos tres para empezar. Fíjate en las palabras cortas: casi siempre
        son <b>DE</b>, <b>LA</b> o <b>UNA</b>.
      </p>
      <div class="cip-note" id="cipNote"></div>
      <div class="row">
        <button class="btn ghost" id="cipHint" type="button">PISTA (3)</button>
        <button class="btn ghost" id="cipClear" type="button">VACIAR</button>
        <span class="t-dim" id="cipState">0 / ${usadas.length} letras</span>
      </div>
      <p class="t-dim" style="font-size:.58rem;letter-spacing:.16em;margin:.6rem 0 .2rem">
        LETRAS DEL CIFRADO — pulsa una</p>
      <div class="cip-keys" id="cipKeys"></div>
      <p class="t-dim" style="font-size:.58rem;letter-spacing:.16em;margin:.6rem 0 .2rem">
        ALFABETO REAL — asigna</p>
      <div class="cip-abc" id="cipAbc"></div>
      <div id="cipOut"></div>
    </div>`;

  const q = (s) => win.body.querySelector(s);

  function pintarNota() {
    q('#cipNote').innerHTML = [...cifrada].map((c) => {
      if (c === ' ') return `<span class="cip-ch sp"> </span>`;
      const v = puesto[c];
      return `<span class="cip-ch ${v ? 'sol' : 'raw'}">${v || c}</span>`;
    }).join('');
  }

  function pintarKeys() {
    q('#cipKeys').innerHTML = usadas.map((c) =>
      `<button class="cip-key ${puesto[c] ? 'done' : ''} ${sel === c ? 'sel' : ''}" type="button" data-c="${c}">
        <b>${c}</b><span>${puesto[c] || ''}</span></button>`).join('');
  }

  function pintarAbc() {
    const yaUsadas = new Set(Object.values(puesto));
    q('#cipAbc').innerHTML = [...ABC].map((c) =>
      `<button class="${yaUsadas.has(c) ? 'used' : ''}" type="button" data-p="${c}">${c}</button>`).join('');
  }

  function estado() {
    const n = Object.keys(puesto).length;
    q('#cipState').textContent = `${n} / ${usadas.length} letras`;
    const claro = [...cifrada].map((c) => (c === ' ' ? ' ' : puesto[c] || '·')).join('');
    if (claro === NOTA) ganar();
  }

  function ganar() {
    Sound.fanfare();
    q('#cipOut').innerHTML = `<div class="won">NOTA DESCIFRADA:<br>
      «${NOTA}»<br><br>La fecha del sobre:<br><b>${ctx.claves.fecha.value}</b></div>`;
    q('#cipHint').disabled = true;
    ctx.grantClave('fecha');
  }

  function asignar(cif, claro) {
    // una letra clara no puede usarse dos veces
    for (const k of Object.keys(puesto)) if (puesto[k] === claro && k !== cif) delete puesto[k];
    puesto[cif] = claro;
    sel = null;
    pintarNota(); pintarKeys(); pintarAbc(); estado();
  }

  q('#cipKeys').addEventListener('click', (e) => {
    const b = e.target.closest('.cip-key');
    if (!b) return;
    sel = sel === b.dataset.c ? null : b.dataset.c;
    Sound.blip(660, 0.035, 0.05);
    pintarKeys();
  });

  q('#cipAbc').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (!sel) { toast('ELIGE PRIMERO UNA LETRA DEL CIFRADO'); return; }
    Sound.blip(820, 0.04, 0.06);
    asignar(sel, b.dataset.p);
  });

  q('#cipClear').addEventListener('click', () => {
    for (const k of Object.keys(puesto)) delete puesto[k];
    sel = null;
    regalar(3);
    pintarNota(); pintarKeys(); pintarAbc(); estado();
  });

  q('#cipHint').addEventListener('click', () => {
    if (pistas <= 0) { toast('SIN PISTAS'); return; }
    const faltan = usadas.filter((c) => puesto[c] !== correcta[c]);
    if (!faltan.length) return;
    const c = pick(faltan);
    asignar(c, correcta[c]);
    pistas -= 1;
    q('#cipHint').textContent = `PISTA (${pistas})`;
    q('#cipHint').disabled = pistas <= 0;
    Sound.blip(1000, 0.06, 0.07);
  });

  /** Regala n letras de las más repetidas: hace falta un punto de apoyo. */
  function regalar(n) {
    const frec = {};
    for (const c of cifrada.replace(/ /g, '')) frec[c] = (frec[c] || 0) + 1;
    usadas.slice().sort((a, b) => frec[b] - frec[a]).slice(0, n)
      .forEach((c) => { puesto[c] = correcta[c]; });
  }

  regalar(3);
  pintarNota(); pintarKeys(); pintarAbc(); estado();

  if (done) {
    for (const c of usadas) puesto[c] = correcta[c];
    pintarNota(); pintarKeys(); pintarAbc();
    q('#cipHint').disabled = true;
    q('#cipOut').innerHTML = `<div class="won">EJERCICIO SUPERADO.<br>
      «${NOTA}»<br><br>Fecha en tu poder:<br><b>${ctx.claves.fecha.value}</b></div>`;
  }
}
