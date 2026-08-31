/* ════════════════════════════════════════════════════════════
   games.js — los tres ejercicios de campo
   Cada uno entrega una clave distinta al superarse.
   ════════════════════════════════════════════════════════════ */
import { $, clamp, pad, wait, Sound, Win, toast, REDUCED } from './core.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));

/* ─────────────────────────────────────────────────────────────
   1 · TRIANGULACIÓN  (visible: comando TRIANGULAR)
   Tres repetidores, tres distancias, un solo punto posible.
   ───────────────────────────────────────────────────────────── */
export function openTriangulacion(ctx) {
  const win = Win.open({ id: 'tri', title: 'TRIANGULACIÓN DE SEÑAL — ejercicio de campo', w: 560, h: 620 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const done = ctx.hasClave('lat');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 01 · TRIANGULACIÓN</h4>
      <p class="brief">
        Tres repetidores registraron la misma señal. Cada uno informa a qué distancia estaba el emisor.
        Sólo hay un punto del plano compatible con las tres lecturas. Márquelo.
      </p>
      <div class="tri-reads" id="triReads"></div>
      <canvas class="tri-cv" id="triCv" width="520" height="380"></canvas>
      <div class="row">
        <button class="btn" id="triRadios" type="button">TRAZAR RADIOS</button>
        <button class="btn ghost" id="triNuevo" type="button">OTRA LECTURA</button>
        <span class="t-dim" id="triTries">intentos: 0</span>
      </div>
      <div id="triOut"></div>
    </div>`;

  const cv = win.body.querySelector('#triCv');
  const cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  let towers = [], target = null, tries = 0, showRadii = false, guess = null, solved = done;

  function reset() {
    towers = [
      { x: rnd(60, 180), y: rnd(60, 150), n: 'R-1' },
      { x: rnd(340, 460), y: rnd(70, 170), n: 'R-2' },
      { x: rnd(180, 340), y: rnd(260, 330), n: 'R-3' },
    ];
    target = { x: rnd(120, 400), y: rnd(120, 270) };
    tries = 0; showRadii = false; guess = null;
    win.body.querySelector('#triTries').textContent = 'intentos: 0';
    win.body.querySelector('#triOut').innerHTML = '';
    win.body.querySelector('#triReads').innerHTML = towers
      .map((t) => {
        const d = Math.hypot(t.x - target.x, t.y - target.y);
        return `<div class="tri-read"><b>${d.toFixed(1)}</b><span>${t.n} · UNIDADES</span></div>`;
      })
      .join('');
    draw();
  }

  function draw(mouse) {
    cx.clearRect(0, 0, W, H);

    // rejilla
    cx.strokeStyle = 'rgba(120,130,150,.10)';
    cx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = 0; y <= H; y += 40) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }

    // radios
    if (showRadii) {
      cx.strokeStyle = 'rgba(255,180,61,.30)';
      for (const t of towers) {
        const d = Math.hypot(t.x - target.x, t.y - target.y);
        cx.beginPath(); cx.arc(t.x, t.y, d, 0, Math.PI * 2); cx.stroke();
      }
    }

    // repetidores
    for (const t of towers) {
      cx.fillStyle = '#ffb43d';
      cx.beginPath(); cx.arc(t.x, t.y, 4, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = 'rgba(255,180,61,.45)';
      cx.beginPath(); cx.arc(t.x, t.y, 10, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = '#6b7280';
      cx.font = '10px "Share Tech Mono", monospace';
      cx.fillText(t.n, t.x + 14, t.y + 3);
    }

    // retícula del cursor
    if (mouse && !solved) {
      cx.strokeStyle = 'rgba(120,130,150,.35)';
      cx.beginPath(); cx.moveTo(mouse.x, 0); cx.lineTo(mouse.x, H); cx.stroke();
      cx.beginPath(); cx.moveTo(0, mouse.y); cx.lineTo(W, mouse.y); cx.stroke();
    }

    // marca del intento
    if (guess) {
      cx.strokeStyle = solved ? '#58d68d' : '#ff4438';
      cx.lineWidth = 1.6;
      cx.beginPath(); cx.moveTo(guess.x - 8, guess.y); cx.lineTo(guess.x + 8, guess.y); cx.stroke();
      cx.beginPath(); cx.moveTo(guess.x, guess.y - 8); cx.lineTo(guess.x, guess.y + 8); cx.stroke();
      cx.lineWidth = 1;
    }

    // solución
    if (solved && target) {
      cx.strokeStyle = '#58d68d';
      cx.beginPath(); cx.arc(target.x, target.y, 13, 0, Math.PI * 2); cx.stroke();
    }
  }

  const toCanvas = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  cv.addEventListener('pointermove', (e) => { if (!solved) draw(toCanvas(e)); });
  cv.addEventListener('pointerleave', () => draw());

  cv.addEventListener('pointerdown', (e) => {
    if (solved) return;
    guess = toCanvas(e);
    tries += 1;
    win.body.querySelector('#triTries').textContent = 'intentos: ' + tries;
    const d = Math.hypot(guess.x - target.x, guess.y - target.y);
    const out = win.body.querySelector('#triOut');

    if (d <= 20) {
      solved = true;
      draw();
      Sound.fanfare();
      out.innerHTML = `<div class="won">POSICIÓN CONFIRMADA en ${tries} ${tries === 1 ? 'intento' : 'intentos'}.<br>
        Coordenada recuperada:<br><b>${ctx.claves.lat.value}</b></div>`;
      ctx.grantClave('lat');
    } else {
      Sound.buzz();
      draw();
      const cerca = d < 55 ? 'muy cerca' : d < 120 ? 'cerca' : 'lejos';
      out.innerHTML = `<p class="lost">Sin coincidencia — ${cerca} (${d.toFixed(0)} unidades de error).</p>`;
      if (tries >= 2 && !showRadii) {
        showRadii = true;
        out.innerHTML += `<p class="t-dim">Se trazan los radios automáticamente.</p>`;
        draw();
      }
    }
  });

  win.body.querySelector('#triRadios').addEventListener('click', () => {
    showRadii = !showRadii; draw(); Sound.blip(620, 0.04);
  });
  win.body.querySelector('#triNuevo').addEventListener('click', () => {
    if (solved) { toast('EJERCICIO YA SUPERADO'); return; }
    reset(); Sound.blip(520, 0.05);
  });

  reset();
  if (done) {
    solved = true;
    win.body.querySelector('#triOut').innerHTML =
      `<div class="won">EJERCICIO SUPERADO.<br>Coordenada en su poder:<br><b>${ctx.claves.lat.value}</b></div>`;
  }
}

/* ─────────────────────────────────────────────────────────────
   2 · CAJA 419  (oculto: comando CAJA 419)
   Cuatro dígitos. La cerradura dice cuántos aciertas
   y cuántos están en su sitio. Doce intentos, como NUEVE.
   ───────────────────────────────────────────────────────────── */
export function openCaja(ctx) {
  const win = Win.open({ id: 'caja', title: 'CAJA 419 — simulador de cerradura', w: 470, h: 620 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const MAX = 12;
  const done = ctx.hasClave('lon');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 02 · CERRADURA ROTATORIA</h4>
      <p class="brief">
        Cuatro dígitos, del 0 al 9, con repeticiones posibles.
        Tras cada intento la cerradura revela cuántos dígitos son correctos
        y cuántos de ellos además están en su posición. Doce intentos.
      </p>
      <div class="safe-display" id="safeDisp"></div>
      <div class="safe-pad" id="safePad"></div>
      <div class="row">
        <button class="btn" id="safeGo" type="button">PROBAR</button>
        <button class="btn ghost" id="safeDel" type="button">BORRAR</button>
        <span class="t-dim" id="safeLeft">${MAX} intentos</span>
      </div>
      <div class="safe-log" id="safeLog"></div>
      <div id="safeOut"></div>
    </div>`;

  const disp = win.body.querySelector('#safeDisp');
  const log = win.body.querySelector('#safeLog');
  const out = win.body.querySelector('#safeOut');

  const secret = Array.from({ length: 4 }, () => rndInt(0, 9));
  let entry = [];
  let left = MAX;
  let solved = done;

  function renderDisp() {
    disp.innerHTML = Array.from({ length: 4 }, (_, i) =>
      `<div class="safe-digit ${i === entry.length ? 'active' : ''}">${entry[i] ?? '·'}</div>`).join('');
  }

  win.body.querySelector('#safePad').innerHTML =
    Array.from({ length: 10 }, (_, d) => `<button class="safe-key" type="button" data-d="${d}">${d}</button>`).join('');

  win.body.querySelector('#safePad').addEventListener('click', (e) => {
    const b = e.target.closest('.safe-key');
    if (!b || solved || entry.length >= 4) return;
    entry.push(Number(b.dataset.d));
    Sound.blip(500 + Number(b.dataset.d) * 45, 0.04, 0.07);
    renderDisp();
  });

  win.body.querySelector('#safeDel').addEventListener('click', () => {
    if (solved) return;
    entry.pop(); Sound.blip(320, 0.04, 0.06); renderDisp();
  });

  /** Cuenta exactos y parciales sin contar dos veces el mismo dígito. */
  function evaluate(guess) {
    const s = [...secret], g = [...guess];
    let exact = 0;
    for (let i = 3; i >= 0; i--) {
      if (g[i] === s[i]) { exact++; s.splice(i, 1); g.splice(i, 1); }
    }
    let partial = 0;
    for (const d of g) {
      const k = s.indexOf(d);
      if (k !== -1) { partial++; s.splice(k, 1); }
    }
    return { exact, partial };
  }

  win.body.querySelector('#safeGo').addEventListener('click', () => {
    if (solved) return;
    if (entry.length < 4) { toast('FALTAN DÍGITOS'); Sound.buzz(); return; }

    const guess = [...entry];
    const { exact, partial } = evaluate(guess);
    left -= 1;
    win.body.querySelector('#safeLeft').textContent = `${left} intentos`;

    const row = document.createElement('div');
    row.className = 'safe-try';
    row.innerHTML = `<span class="cmb">${guess.join('')}</span>
      <span class="fb"><span class="ex">${exact} en sitio</span> · <span class="pa">${partial} sueltos</span></span>`;
    log.prepend(row);

    entry = [];
    renderDisp();

    if (exact === 4) {
      solved = true;
      Sound.fanfare();
      out.innerHTML = `<div class="won">CERRADURA ABIERTA con ${MAX - left} ${MAX - left === 1 ? 'intento' : 'intentos'}.<br>
        Dentro, escrito a mano:<br><b>${ctx.claves.lon.value}</b></div>`;
      ctx.grantClave('lon');
      return;
    }

    Sound.blip(exact ? 700 : 300, 0.06, 0.07);

    if (left <= 0) {
      Sound.buzz();
      out.innerHTML = `<p class="lost">Bloqueo por exceso de intentos. La combinación era ${secret.join('')}.</p>
        <p class="t-dim">Cierre y vuelva a abrir el simulador para una combinación nueva.</p>`;
      solved = true;
    }
  });

  renderDisp();
  if (done) {
    out.innerHTML = `<div class="won">EJERCICIO SUPERADO.<br>Anotación en su poder:<br><b>${ctx.claves.lon.value}</b></div>`;
  }
}

/* ─────────────────────────────────────────────────────────────
   3 · SECUENCIA  (oculto: comando SECUENCIA)
   Once tonos. Se puede pedir repetición: el emisor
   siempre repite. Lo que no perdona es contestar mal.
   ───────────────────────────────────────────────────────────── */
export function openSecuencia(ctx) {
  const win = Win.open({ id: 'seq', title: 'SECUENCIA INTERCEPTADA — reproductor', w: 440, h: 560 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  const GOAL = 11;
  const FREQS = [261.63, 349.23, 440.0, 587.33];
  const NAMES = ['A', 'B', 'C', 'D'];
  const done = ctx.hasClave('hora');

  win.body.innerHTML = `
    <div class="gm">
      <h4>EJERCICIO 03 · RESPUESTA POR TONOS</h4>
      <p class="brief">
        El emisor lanza una secuencia y espera que la devuelva entera.
        Cada acierto añade un tono. Hay que llegar a <b>${GOAL}</b>.
        Puede pedir repetición las veces que quiera: eso no penaliza.
        Tiene <b>tres</b> reintentos; al agotarlos se vuelve al principio.
        Suba el volumen, se distinguen mejor de oído que de vista.
      </p>
      <div class="seq-meter" id="seqMeter"></div>
      <div class="seq-pads" id="seqPads"></div>
      <div class="row">
        <button class="btn" id="seqStart" type="button">EMITIR</button>
        <button class="btn ghost" id="seqAgain" type="button" disabled>REPETIR</button>
        <span class="t-dim" id="seqLen">longitud 0 / ${GOAL}</span>
        <span class="t-dim" id="seqLives">reintentos ●●●</span>
      </div>
      <div id="seqOut"></div>
    </div>`;

  const padsEl = win.body.querySelector('#seqPads');
  const meter = win.body.querySelector('#seqMeter');
  const out = win.body.querySelector('#seqOut');
  const btnStart = win.body.querySelector('#seqStart');
  const btnAgain = win.body.querySelector('#seqAgain');

  padsEl.innerHTML = NAMES.map((n, i) =>
    `<button class="seq-pad" type="button" data-i="${i}" disabled>${n}</button>`).join('');
  const pads = [...padsEl.querySelectorAll('.seq-pad')];

  meter.innerHTML = Array.from({ length: GOAL }, () => '<i></i>').join('');
  const bars = [...meter.querySelectorAll('i')];

  let seq = [], input = 0, playing = false, solved = done, lives = 3;

  const setEnabled = (v) => pads.forEach((p) => { p.disabled = !v; });

  function updateMeter() {
    bars.forEach((b, i) => b.classList.toggle('on', i < seq.length));
    win.body.querySelector('#seqLen').textContent = `longitud ${seq.length} / ${GOAL}`;
  }

  async function flash(i, ms = 340) {
    pads[i].classList.add('lit');
    Sound.tone(FREQS[i], ms / 1000);
    await wait(ms);
    pads[i].classList.remove('lit');
    await wait(REDUCED ? 40 : 110);
  }

  async function playSeq() {
    playing = true;
    setEnabled(false);
    btnAgain.disabled = true;
    await wait(350);
    for (const i of seq) await flash(i);
    playing = false;
    setEnabled(true);
    btnAgain.disabled = false;
    input = 0;
  }

  async function nextRound() {
    seq.push(rndInt(0, 3));
    updateMeter();
    await playSeq();
  }

  padsEl.addEventListener('click', async (e) => {
    const b = e.target.closest('.seq-pad');
    if (!b || playing || solved) return;
    const i = Number(b.dataset.i);
    b.classList.add('lit');
    Sound.tone(FREQS[i], 0.22);
    setTimeout(() => b.classList.remove('lit'), 190);

    if (seq[input] !== i) {
      Sound.buzz();
      setEnabled(false);
      btnAgain.disabled = true;
      lives -= 1;
      win.body.querySelector('#seqLives').textContent =
        'reintentos ' + '●'.repeat(Math.max(0, lives)) + '○'.repeat(3 - Math.max(0, lives));

      if (lives > 0) {
        out.innerHTML = `<p class="lost">Error en la posición ${input + 1}.
          El emisor repite la misma secuencia. Quedan ${lives}.</p>`;
        input = 0;
        await wait(900);
        playSeq();
        return;
      }

      out.innerHTML = `<p class="lost">Tercer error. La escucha se corta y hay que empezar de cero.
        Vuelva a EMITIR.</p>`;
      seq = []; input = 0; lives = 3;
      win.body.querySelector('#seqLives').textContent = 'reintentos ●●●';
      updateMeter();
      btnStart.disabled = false;
      return;
    }

    input += 1;
    if (input === seq.length) {
      if (seq.length >= GOAL) {
        solved = true;
        setEnabled(false);
        btnAgain.disabled = true;
        Sound.fanfare();
        out.innerHTML = `<div class="won">SECUENCIA DEVUELTA COMPLETA.<br>
          El emisor contesta una sola vez, con una hora:<br><b>${ctx.claves.hora.value}</b></div>`;
        ctx.grantClave('hora');
        return;
      }
      out.innerHTML = `<p class="t-ok">Correcto. El emisor añade un tono.</p>`;
      setEnabled(false);
      await wait(600);
      nextRound();
    }
  });

  btnStart.addEventListener('click', () => {
    if (solved) { toast('EJERCICIO YA SUPERADO'); return; }
    seq = []; input = 0; lives = 3; out.innerHTML = '';
    win.body.querySelector('#seqLives').textContent = 'reintentos ●●●';
    btnStart.disabled = true;
    nextRound();
  });

  btnAgain.addEventListener('click', () => {
    if (playing || solved || !seq.length) return;
    playSeq();
  });

  updateMeter();
  if (done) {
    setEnabled(false);
    btnStart.disabled = true;
    out.innerHTML = `<div class="won">EJERCICIO SUPERADO.<br>Hora en su poder:<br><b>${ctx.claves.hora.value}</b></div>`;
  }
}
