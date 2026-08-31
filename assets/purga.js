/* ════════════════════════════════════════════════════════════
   purga.js — PURGA DEL SISTEMA

   Cuando algo entra en el terminal, hay que recorrer la memoria
   y limpiarla sector por sector antes de que los procesos
   hostiles te alcancen. Verde de fósforo, como debe ser.
   ════════════════════════════════════════════════════════════ */
import { Sound, Win, toast, pick } from './core.js';

const MAPA = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '#........@........#',
  '####.###.#.###.####',
  '#....#...#...#....#',
  '#.##.#.#####.#.##.#',
  '#.................#',
  '#o##.###.#.###.##o#',
  '#........#........#',
  '###################',
];
const COLS = MAPA[0].length, ROWS = MAPA.length, CELL = 22;
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/**
 * Abre la purga. `onFin(true|false)` se llama al ganar o perder.
 * `motivo` sale en la cabecera para explicar por qué se abre.
 */
export function openPurga(onFin, motivo = 'INTRUSIÓN DETECTADA') {
  const win = Win.open({
    id: 'purga',
    title: 'PURGA DE MEMORIA — proceso crítico',
    w: COLS * CELL + 40, h: ROWS * CELL + 210,
    cls: 'purga-win',
  });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `
    <div class="gm purga">
      <h4>${motivo}</h4>
      <p class="brief">
        Algo se está copiando por la memoria del terminal.
        Recorra todos los sectores para limpiarlos.
        Los <b>puntos grandes</b> invierten la situación durante unos segundos:
        mientras parpadean, los procesos huyen y puede absorberlos.
        Muévase con las <b>flechas</b> o <b>WASD</b>.
      </p>
      <div class="purga-hud">
        <span>SECTORES <b id="pgDots">0</b></span>
        <span>INTENTOS <b id="pgVidas">♦♦♦</b></span>
        <span id="pgEstado">PULSE EMPEZAR</span>
      </div>
      <canvas id="pgCv" width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
      <div class="row">
        <button class="btn hot" id="pgGo" type="button">EMPEZAR</button>
        <span class="t-dim">también sirve deslizar el dedo</span>
      </div>
      <div id="pgOut"></div>
    </div>`;

  const q = (s) => win.body.querySelector(s);
  const cv = q('#pgCv'), cx = cv.getContext('2d');

  let rejilla, jugador, procesos, puntos, total, vidas, miedo, bucle = 0, vivo = false, acabado = false;

  const pared = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || rejilla[y][x] === '#';

  function reiniciar() {
    rejilla = MAPA.map((f) => f.split(''));
    puntos = 0; total = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (rejilla[y][x] === '.' || rejilla[y][x] === 'o') total += 1;
      }
    }
    jugador = { x: 9, y: 11, dx: 0, dy: 0, sig: null, boca: 0 };
    procesos = [
      { x: 9, y: 7, c: '#7df0c8' },
      { x: 8, y: 7, c: '#c9a3ff' },
      { x: 10, y: 7, c: '#ff7ad0' },
    ].map((p) => ({ ...p, dx: 0, dy: -1, casa: { x: p.x, y: p.y } }));
    miedo = 0;
    q('#pgDots').textContent = `0/${total}`;
  }

  function pintar() {
    cx.fillStyle = '#03060a';
    cx.fillRect(0, 0, cv.width, cv.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = rejilla[y][x];
        const px = x * CELL, py = y * CELL;
        if (c === '#') {
          cx.fillStyle = 'rgba(30,200,140,.13)';
          cx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
          cx.strokeStyle = 'rgba(60,255,180,.32)';
          cx.lineWidth = 1;
          cx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
        } else if (c === '.') {
          cx.fillStyle = 'rgba(125,240,200,.6)';
          cx.fillRect(px + CELL / 2 - 1.5, py + CELL / 2 - 1.5, 3, 3);
        } else if (c === 'o') {
          cx.fillStyle = '#7df0c8';
          cx.beginPath();
          cx.arc(px + CELL / 2, py + CELL / 2, 5 + Math.sin(Date.now() / 180) * 1.4, 0, Math.PI * 2);
          cx.fill();
        }
      }
    }

    // el agente
    const jx = jugador.x * CELL + CELL / 2, jy = jugador.y * CELL + CELL / 2;
    jugador.boca = (jugador.boca + 0.28) % (Math.PI / 2);
    const ang = Math.atan2(jugador.dy, jugador.dx);
    cx.fillStyle = '#e7ffe9';
    cx.beginPath();
    cx.moveTo(jx, jy);
    cx.arc(jx, jy, CELL / 2 - 2, ang + jugador.boca, ang - jugador.boca + Math.PI * 2);
    cx.closePath();
    cx.fill();

    // los procesos
    for (const p of procesos) {
      const px = p.x * CELL + CELL / 2, py = p.y * CELL + CELL / 2;
      cx.fillStyle = miedo > 0 ? (miedo < 90 && Math.floor(miedo / 8) % 2 ? '#39405e' : '#5b6fff') : p.c;
      cx.beginPath();
      cx.arc(px, py, CELL / 2 - 2, Math.PI, 0);
      cx.lineTo(px + CELL / 2 - 2, py + CELL / 2 - 3);
      cx.lineTo(px, py + CELL / 4);
      cx.lineTo(px - CELL / 2 + 2, py + CELL / 2 - 3);
      cx.closePath();
      cx.fill();
      cx.fillStyle = '#03060a';
      cx.fillRect(px - 4, py - 3, 3, 4);
      cx.fillRect(px + 1, py - 3, 3, 4);
    }
  }

  function mover() {
    // el jugador gira en cuanto puede
    if (jugador.sig) {
      const [dx, dy] = jugador.sig;
      if (!pared(jugador.x + dx, jugador.y + dy)) {
        jugador.dx = dx; jugador.dy = dy; jugador.sig = null;
      }
    }
    if (!pared(jugador.x + jugador.dx, jugador.y + jugador.dy)) {
      jugador.x += jugador.dx; jugador.y += jugador.dy;
    }

    const c = rejilla[jugador.y][jugador.x];
    if (c === '.' || c === 'o') {
      rejilla[jugador.y][jugador.x] = ' ';
      puntos += 1;
      q('#pgDots').textContent = `${puntos}/${total}`;
      Sound.blip(c === 'o' ? 300 : 1500, 0.02, 0.03);
      if (c === 'o') { miedo = 300; q('#pgEstado').textContent = 'PROCESOS VULNERABLES'; }
      if (puntos >= total) return fin(true);
    }

    if (miedo > 0) {
      miedo -= 1;
      if (miedo === 0) q('#pgEstado').textContent = 'PURGANDO';
    }

    // los procesos persiguen; huyen mientras dure el miedo
    for (const p of procesos) {
      const ops = Object.values(DIRS).filter(([dx, dy]) =>
        !pared(p.x + dx, p.y + dy) && !(dx === -p.dx && dy === -p.dy));
      if (ops.length) {
        const peso = ([dx, dy]) => {
          const d = Math.hypot(p.x + dx - jugador.x, p.y + dy - jugador.y);
          return miedo > 0 ? -d : d;
        };
        ops.sort((a, b) => peso(a) - peso(b));
        // algo de azar para que no sea siempre óptimo
        const [dx, dy] = Math.random() < 0.78 ? ops[0] : pick(ops);
        p.dx = dx; p.dy = dy;
      }
      p.x += p.dx; p.y += p.dy;

      if (p.x === jugador.x && p.y === jugador.y) {
        if (miedo > 0) {
          Sound.blip(1200, 0.12, 0.09);
          p.x = p.casa.x; p.y = p.casa.y; p.dx = 0; p.dy = -1;
        } else {
          return tocado();
        }
      }
    }
  }

  function tocado() {
    vidas -= 1;
    q('#pgVidas').textContent = '♦'.repeat(Math.max(0, vidas)) + '◇'.repeat(3 - Math.max(0, vidas));
    Sound.buzz();
    if (vidas <= 0) return fin(false);
    jugador.x = 9; jugador.y = 11; jugador.dx = 0; jugador.dy = 0; jugador.sig = null;
    procesos.forEach((p) => { p.x = p.casa.x; p.y = p.casa.y; p.dx = 0; p.dy = -1; });
    miedo = 0;
    q('#pgEstado').textContent = 'SECTOR REINICIADO';
  }

  function fin(gano) {
    if (acabado) return;
    acabado = true; vivo = false;
    clearInterval(bucle); bucle = 0;
    pintar();
    q('#pgGo').disabled = true;

    if (gano) {
      Sound.fanfare();
      q('#pgEstado').textContent = 'MEMORIA LIMPIA';
      q('#pgOut').innerHTML = `<div class="won">MEMORIA PURGADA.<br>
        El proceso hostil ha sido eliminado del terminal.</div>`;
    } else {
      q('#pgEstado').textContent = 'PURGA FALLIDA';
      q('#pgOut').innerHTML = `<p class="lost">La purga ha fallado. Algo se ha quedado dentro.<br>
        Puede volver a intentarlo escribiendo <b>ANTIVIRUS</b> en la consola.</p>`;
    }
    setTimeout(() => onFin?.(gano), 1400);
  }

  function empezar() {
    reiniciar();
    vidas = 3; acabado = false; vivo = true;
    q('#pgVidas').textContent = '♦♦♦';
    q('#pgEstado').textContent = 'PURGANDO';
    q('#pgOut').innerHTML = '';
    q('#pgGo').textContent = 'REINICIAR';
    clearInterval(bucle);
    bucle = setInterval(() => { if (vivo) { mover(); pintar(); } }, 165);
  }

  q('#pgGo').addEventListener('click', empezar);

  win.root.tabIndex = -1;
  win.root.addEventListener('keydown', (e) => {
    const wasd = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' }[e.key.toLowerCase()];
    const k = DIRS[e.key] ? e.key : wasd;
    if (!k || !DIRS[k]) return;
    e.preventDefault();
    jugador.sig = DIRS[k];
  });
  setTimeout(() => win.root.focus(), 80);

  // deslizar en táctil
  let tx = 0, ty = 0;
  cv.addEventListener('pointerdown', (e) => { tx = e.clientX; ty = e.clientY; });
  cv.addEventListener('pointerup', (e) => {
    const dx = e.clientX - tx, dy = e.clientY - ty;
    if (Math.hypot(dx, dy) < 18) return;
    jugador.sig = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
  });

  win._onClose = () => { clearInterval(bucle); if (!acabado) onFin?.(false); };
  reiniciar();
  pintar();
}
