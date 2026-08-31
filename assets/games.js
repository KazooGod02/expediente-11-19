/* ════════════════════════════════════════════════════════════
   games.js — los cuatro ejercicios de campo
   Cada uno entrega una lectura distinta al superarse.
   ════════════════════════════════════════════════════════════ */
import { wait, pad, clamp, rnd, rndInt, pick, Sound, Win, toast, REDUCED } from './core.js';

/* ═════════════════════════════════════════════════════════════
   1 · ANÁLISIS DE CINTA         comando: ANALIZAR
   Los once segundos del vestíbulo, fotograma a fotograma.
   En tres de ellos hay un reflejo que no debería estar ahí.
   ═════════════════════════════════════════════════════════════ */
const CINTA = { fps: 12, seg: 11 };
const TOTAL_F = CINTA.fps * CINTA.seg;          // 132 fotogramas

export function openAnalisis(ctx) {
  const win = Win.open({ id: 'tape', title: 'ANÁLISIS DE CINTA — vestíbulo 03:41', w: 600, h: 660 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const done = ctx.hasClave('lat');
  // el reflejo aparece en tres fotogramas seguidos, distintos cada partida
  const objetivo = rndInt(46, TOTAL_F - 34);

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 01 · ANÁLISIS DE CINTA</h4>
      <p class="brief">
        Once segundos de vestíbulo antes de que la cámara se fuera a negro.
        Entran tres siluetas y ninguna da la cara.
        Pero en <b>tres fotogramas</b> hay un reflejo en el cristal que no cuadra
        con nadie que esté en el plano. Encuéntrelo y márquelo.
        Use <b>REALCE</b> si la imagen va oscura, y las flechas ← → para ir de uno en uno.
      </p>
      <canvas class="tape-cv" id="tapeCv" width="560" height="315"></canvas>
      <div class="tape-track">
        <input id="tapeF" class="tape-range" type="range" min="0" max="${TOTAL_F - 1}" step="1" value="0"
               aria-label="Fotograma">
        <div class="tape-marks" id="tapeMarks"></div>
      </div>
      <div class="row">
        <button class="btn ghost" id="tapePlay" type="button">▶ REPRODUCIR</button>
        <button class="btn ghost" id="tapeEnh" type="button">REALCE</button>
        <button class="btn hot" id="tapeMark" type="button">MARCAR FOTOGRAMA</button>
        <span class="t-dim" id="tapeInfo">FOT 000 · 00.00 s</span>
      </div>
      <div id="tapeOut"></div>
    </div>`;

  const q = (sel) => win.body.querySelector(sel);
  const cv = q('#tapeCv'), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const range = q('#tapeF');

  let f = 0, realce = false, tocado = 0, solved = done, playing = 0;

  const hayReflejo = (n) => n >= objetivo && n < objetivo + 3;

  function pie(n) {
    cx.fillStyle = 'rgba(231,226,242,.75)';
    cx.font = '12px "Share Tech Mono", monospace';
    cx.textAlign = 'left';
    cx.fillText('CAM 02 · VESTÍBULO', 12, 22);
    cx.fillText('03:41:' + pad(Math.floor(n / CINTA.fps) + 49), W - 112, 22);
    if (realce) {
      cx.fillStyle = 'rgba(125,240,200,.8)';
      cx.fillText('REALCE ACTIVO', 12, H - 12);
    }
  }

  function dibujar(n) {
    cx.fillStyle = '#07070b';
    cx.fillRect(0, 0, W, H);

    if (n > TOTAL_F - 6) {                       // la cámara se cae al final
      cx.fillStyle = 'rgba(180,180,190,.06)';
      for (let i = 0; i < 500; i++) cx.fillRect(Math.random() * W, Math.random() * H, 2, 1);
      cx.fillStyle = 'rgba(140,130,175,.55)';
      cx.font = '13px "Share Tech Mono", monospace';
      cx.textAlign = 'center';
      cx.fillText('SEÑAL PERDIDA', W / 2, H / 2);
      pie(n);
      return;
    }

    const g = realce ? 1.9 : 1;

    cx.fillStyle = `rgba(30,26,44,${0.9 * g})`;
    cx.fillRect(0, H * 0.62, W, H * 0.38);
    cx.fillStyle = `rgba(46,40,66,${0.8 * g})`;
    cx.fillRect(W * 0.05, H * 0.44, W * 0.42, H * 0.2);

    // cristalera del fondo: aquí aparece el reflejo
    const gx = W * 0.55, gy = H * 0.16, gw = W * 0.4, gh = H * 0.42;
    cx.fillStyle = `rgba(58,52,88,${0.42 * g})`;
    cx.fillRect(gx, gy, gw, gh);
    cx.strokeStyle = `rgba(150,140,190,${0.3 * g})`;
    cx.lineWidth = 1;
    cx.strokeRect(gx, gy, gw, gh);
    for (let i = 1; i < 3; i++) {
      cx.beginPath();
      cx.moveTo(gx + (gw / 3) * i, gy);
      cx.lineTo(gx + (gw / 3) * i, gy + gh);
      cx.stroke();
    }

    const sil = (x, alto, alfa) => {
      cx.fillStyle = `rgba(10,9,16,${alfa})`;
      cx.beginPath();
      cx.ellipse(x, H * 0.46, 13, 15, 0, 0, Math.PI * 2);
      cx.fill();
      cx.fillRect(x - 17, H * 0.52, 34, alto);
    };
    const t = n / TOTAL_F;
    sil(W * 0.08 + t * W * 0.52, H * 0.20, 0.95);
    sil(W * 0.02 + t * W * 0.34, H * 0.19, 0.9);
    if (n > 30) sil(W * 0.9 - (n - 30) * 1.1, H * 0.18, 0.55);

    // el reflejo: una cuarta figura sin cuerpo en el plano
    if (hayReflejo(n)) {
      const rx = gx + gw * 0.62;
      cx.fillStyle = `rgba(210,190,255,${realce ? 0.42 : 0.13})`;
      cx.beginPath();
      cx.ellipse(rx, gy + gh * 0.42, 9, 11, 0, 0, Math.PI * 2);
      cx.fill();
      cx.fillRect(rx - 12, gy + gh * 0.55, 24, gh * 0.3);
      if (realce) {
        cx.strokeStyle = 'rgba(125,240,200,.55)';
        cx.setLineDash([3, 3]);
        cx.strokeRect(rx - 20, gy + gh * 0.26, 40, gh * 0.62);
        cx.setLineDash([]);
      }
    }

    cx.fillStyle = 'rgba(200,200,220,.035)';
    for (let i = 0; i < 260; i++) cx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    cx.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < H; y += 3) cx.fillRect(0, y, W, 1);

    pie(n);
  }

  function ir(n) {
    f = clamp(n, 0, TOTAL_F - 1);
    range.value = f;
    q('#tapeInfo').textContent = `FOT ${pad(f, 3)} · ${(f / CINTA.fps).toFixed(2)} s`;
    dibujar(f);
  }

  range.addEventListener('input', () => ir(Number(range.value)));

  win.root.tabIndex = -1;
  win.root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(f - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(f + 1); }
  });

  q('#tapeEnh').addEventListener('click', () => {
    realce = !realce;
    q('#tapeEnh').classList.toggle('on', realce);
    Sound.blip(realce ? 900 : 500, 0.05);
    dibujar(f);
  });

  q('#tapePlay').addEventListener('click', () => {
    const b = q('#tapePlay');
    if (playing) { clearInterval(playing); playing = 0; b.textContent = '▶ REPRODUCIR'; return; }
    b.textContent = '❚❚ PAUSA';
    playing = setInterval(() => {
      if (f >= TOTAL_F - 1) { clearInterval(playing); playing = 0; b.textContent = '▶ REPRODUCIR'; return; }
      ir(f + 1);
    }, 1000 / CINTA.fps);
  });

  q('#tapeMark').addEventListener('click', () => {
    if (solved) return;
    const out = q('#tapeOut');
    tocado += 1;

    if (hayReflejo(f)) {
      solved = true;
      if (playing) { clearInterval(playing); playing = 0; q('#tapePlay').textContent = '▶ REPRODUCIR'; }
      realce = true; dibujar(f);
      Sound.fanfare();
      out.innerHTML = `<div class="won">REFLEJO AISLADO en el fotograma ${pad(f, 3)}.<br>
        Es una cuarta figura y no hay nadie en el plano que pueda proyectarla.<br>
        En el cristal se lee, invertido, un número:<br><b>${ctx.claves.lat.value}</b></div>`;
      ctx.grantClave('lat');
      return;
    }

    Sound.buzz();
    const lejos = Math.abs(f - objetivo);
    const pista = lejos > 40 ? 'muy lejos' : lejos > 15 ? 'lejos' : 'cerca';
    out.innerHTML = `<p class="lost">Fotograma ${pad(f, 3)}: nada anómalo. Está ${pista}.</p>`;

    if (tocado >= 3 && !realce) {
      realce = true;
      q('#tapeEnh').classList.add('on');
      dibujar(f);
      out.innerHTML += `<p class="t-dim">Le activamos el realce.</p>`;
    }
    if (tocado >= 6) {
      const desde = Math.max(0, objetivo - 12), hasta = Math.min(TOTAL_F - 1, objetivo + 12);
      out.innerHTML += `<p class="t-dim">Acotamos: está entre el ${pad(desde, 3)} y el ${pad(hasta, 3)}.</p>`;
      q('#tapeMarks').innerHTML =
        `<span style="left:${(desde / TOTAL_F) * 100}%;width:${((hasta - desde) / TOTAL_F) * 100}%"></span>`;
    }
  });

  ir(0);
  if (done) {
    solved = true; realce = true;
    q('#tapeEnh').classList.add('on');
    ir(objetivo);
    q('#tapeOut').innerHTML =
      `<div class="won">EJERCICIO SUPERADO.<br>Número recuperado del reflejo:<br><b>${ctx.claves.lat.value}</b></div>`;
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
