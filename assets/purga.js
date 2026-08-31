/* ════════════════════════════════════════════════════════════
   purga.js — PURGA DE MEMORIA

   Cinco zonas distintas del terminal, cada una con su plano y su
   ritmo. Se sortea una cada vez que hay que limpiar el sistema.
   '#' pared · '.' sector · 'o' sector grande · 'P' entrada del
   agente · '@' punto de aparición de los procesos.
   ════════════════════════════════════════════════════════════ */
import { Sound, Win, toast, pick, rndInt } from './core.js';

const ZONAS = [
  {
    nombre: 'MEMORIA PRINCIPAL', procesos: 3, ritmo: 165, miedo: 300,
    mapa: [
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
      '#........P........#',
      '#o##.###.#.###.##o#',
      '#........#........#',
      '###################',
    ],
  },
  {
    nombre: 'SECTOR DE ARRANQUE', procesos: 3, ritmo: 150, miedo: 260,
    mapa: [
      '###################',
      '#o...............o#',
      '#.###.#######.###.#',
      '#...............#.#',
      '#.#.###.###.###...#',
      '#.#.......#.....#.#',
      '#.###.#####.###.#.#',
      '#.........@.......#',
      '#.###.#####.###.#.#',
      '#.#.......#.....#.#',
      '#.#.###.###.###...#',
      '#...............#.#',
      '#.###.#######.###.#',
      '#o.......P.......o#',
      '###################',
    ],
  },
  {
    nombre: 'TABLA DE ARCHIVOS', procesos: 4, ritmo: 172, miedo: 330,
    mapa: [
      '###################',
      '#o...............o#',
      '#.....#.....#.....#',
      '#.###.#.###.#.###.#',
      '#.#.......@.....#.#',
      '#.#.###.#####.#.#.#',
      '#.....#.....#.....#',
      '#.###.#.###.#.###.#',
      '#.....#.....#.....#',
      '#.#.###.#####.#.#.#',
      '#.#.............#.#',
      '#.###.#.###.#.###.#',
      '#.....#..P..#.....#',
      '#o...............o#',
      '###################',
    ],
  },
  {
    nombre: 'NÚCLEO', procesos: 2, ritmo: 128, miedo: 240,
    mapa: [
      '###################',
      '#o...............o#',
      '#.##.##.###.##.##.#',
      '#.................#',
      '#.##.##.###.##.##.#',
      '#.................#',
      '#.##.##.@..##.##..#',
      '#.................#',
      '#.##.##.###.##.##.#',
      '#........P........#',
      '#.##.##.###.##.##.#',
      '#.................#',
      '#.##.##.###.##.##.#',
      '#o...............o#',
      '###################',
    ],
  },
  {
    nombre: 'COPIA DE RESPALDO', procesos: 3, ritmo: 178, miedo: 340,
    mapa: [
      '###################',
      '#o...............o#',
      '#.#.#.#.#.#.#.#.#.#',
      '#.................#',
      '#.###.#.###.#.###.#',
      '#.................#',
      '#.#.#.#..@..#.#.#.#',
      '#.................#',
      '#.###.#.###.#.###.#',
      '#.................#',
      '#.#.#.#..P..#.#.#.#',
      '#.................#',
      '#.###.#.###.#.###.#',
      '#o...............o#',
      '###################',
    ],
  },
];

const CELL = 22;
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/**
 * Abre la purga. `onFin(true|false)` se llama al terminar.
 * `motivo` sale de cabecera. `idx` fuerza una zona concreta.
 */
export function openPurga(onFin, motivo = 'INTRUSIÓN DETECTADA', idx = null) {
  const zona = ZONAS[idx ?? rndInt(0, ZONAS.length - 1)];
  const COLS = zona.mapa[0].length, ROWS = zona.mapa.length;

  const win = Win.open({
    id: 'purga',
    title: 'PURGA DE MEMORIA — ' + zona.nombre,
    w: COLS * CELL + 42, h: ROWS * CELL + 250,
    cls: 'purga-win',
  });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `
    <div class="gm purga">
      <h4>${motivo}</h4>
      <p class="brief">
        Zona afectada: <b>${zona.nombre}</b>.
        Recorra todos los sectores para limpiarlos.
        Los <b>sectores grandes</b> invierten la situación unos segundos: mientras
        parpadean, los procesos huyen y puede absorberlos.
        Muévase con las <b>flechas</b> o <b>WASD</b>.
      </p>
      <div class="purga-hud">
        <span>SECTORES <b id="pgDots">0</b></span>
        <span>INTENTOS <b id="pgVidas">♦♦♦</b></span>
        <span>ZONA <b>${ZONAS.indexOf(zona) + 1}/${ZONAS.length}</b></span>
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

  let rejilla, jugador, procesos, puntos, total, vidas, miedo;
  let bucle = 0, vivo = false, acabado = false;
  let inicio = { x: 1, y: 1 }, casa = { x: 1, y: 1 };

  const pared = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || rejilla[y][x] === '#';

  function reiniciar() {
    rejilla = zona.mapa.map((f) => f.split(''));
    puntos = 0; total = 0;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = rejilla[y][x];
        if (c === 'P') { inicio = { x, y }; rejilla[y][x] = '.'; }
        if (c === '@') { casa = { x, y }; rejilla[y][x] = ' '; }
      }
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (rejilla[y][x] === '.' || rejilla[y][x] === 'o') total += 1;
      }
    }

    jugador = { ...inicio, dx: 0, dy: 0, sig: null, boca: 0 };
    const colores = ['#7df0c8', '#c9a3ff', '#ff7ad0', '#ffd166'];
    procesos = Array.from({ length: zona.procesos }, (_, i) => ({
      x: casa.x, y: casa.y, dx: 0, dy: -1, c: colores[i % colores.length], espera: i * 6,
    }));
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

    const jx = jugador.x * CELL + CELL / 2, jy = jugador.y * CELL + CELL / 2;
    jugador.boca = (jugador.boca + 0.28) % (Math.PI / 2);
    const ang = Math.atan2(jugador.dy, jugador.dx);
    cx.fillStyle = '#e7ffe9';
    cx.beginPath();
    cx.moveTo(jx, jy);
    cx.arc(jx, jy, CELL / 2 - 2, ang + jugador.boca, ang - jugador.boca + Math.PI * 2);
    cx.closePath();
    cx.fill();

    for (const p of procesos) {
      const px = p.x * CELL + CELL / 2, py = p.y * CELL + CELL / 2;
      cx.fillStyle = miedo > 0
        ? (miedo < 90 && Math.floor(miedo / 8) % 2 ? '#39405e' : '#5b6fff')
        : p.c;
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
      if (c === 'o') { miedo = zona.miedo; q('#pgEstado').textContent = 'PROCESOS VULNERABLES'; }
      if (puntos >= total) return fin(true);
    }

    if (miedo > 0) {
      miedo -= 1;
      if (miedo === 0) q('#pgEstado').textContent = 'PURGANDO';
    }

    for (const p of procesos) {
      if (p.espera > 0) { p.espera -= 1; continue; }   // salen escalonados
      const ops = Object.values(DIRS).filter(([dx, dy]) =>
        !pared(p.x + dx, p.y + dy) && !(dx === -p.dx && dy === -p.dy));
      if (ops.length) {
        const peso = ([dx, dy]) => {
          const d = Math.hypot(p.x + dx - jugador.x, p.y + dy - jugador.y);
          return miedo > 0 ? -d : d;
        };
        ops.sort((a, b) => peso(a) - peso(b));
        const [dx, dy] = Math.random() < 0.78 ? ops[0] : pick(ops);
        p.dx = dx; p.dy = dy;
      }
      p.x += p.dx; p.y += p.dy;

      if (p.x === jugador.x && p.y === jugador.y) {
        if (miedo > 0) {
          Sound.blip(1200, 0.12, 0.09);
          p.x = casa.x; p.y = casa.y; p.dx = 0; p.dy = -1; p.espera = 10;
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
    jugador = { ...inicio, dx: 0, dy: 0, sig: null, boca: 0 };
    procesos.forEach((p, i) => {
      p.x = casa.x; p.y = casa.y; p.dx = 0; p.dy = -1; p.espera = i * 6 + 8;
    });
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
      q('#pgOut').innerHTML = `<div class="won">${zona.nombre} PURGADA.<br>
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
    bucle = setInterval(() => { if (vivo) { mover(); pintar(); } }, zona.ritmo);
    win.root.focus();
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

export const ZONAS_PURGA = ZONAS;
