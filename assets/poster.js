/* ════════════════════════════════════════════════════════════
   poster.js — generador de carteles de búsqueda

   Rendimiento: el fondo y la fotografía tratada se dibujan una
   sola vez en lienzos aparte y se reutilizan. Cada pulsación de
   tecla sólo repinta el texto, con un fotograma de por medio.
   ════════════════════════════════════════════════════════════ */
import { Win, Sound, toast } from './core.js';

const W = 900, H = 1270;
const PH = { x: 220, y: 330, w: 460, h: 460 };   // marco del retrato

const ESTILOS = {
  papel: {
    nombre: 'PAPEL ENVEJECIDO',
    fondo: '#d8c49a', tinta: '#3a2812', suave: 'rgba(58,40,18,.72)',
    sello: 'rgba(150,40,28,.5)', marco: 'rgba(58,40,18,.75)',
    tono: [1.06, 0.94, 0.72],
  },
  ficha: {
    nombre: 'FICHA K.P.D.',
    fondo: '#0d0a16', tinta: '#e7e2f2', suave: 'rgba(201,163,255,.75)',
    sello: 'rgba(255,122,208,.55)', marco: 'rgba(201,163,255,.55)',
    tono: [0.82, 0.66, 1.05],
  },
};

export function openPoster() {
  const win = Win.open({ id: 'poster', title: 'CARTEL DE BÚSQUEDA — generador', w: 900, h: 640 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `
    <div class="poster-grid">
      <div>
        <label class="pf"><span>ESTILO</span>
          <select id="pStyle">
            <option value="papel">PAPEL ENVEJECIDO</option>
            <option value="ficha">FICHA K.P.D.</option>
          </select></label>
        <label class="pf"><span>ALIAS</span><input id="pAlias" maxlength="18" value="SUJETO 1"></label>
        <label class="pf"><span>NOMBRE EN EL EXPEDIENTE</span><input id="pName" maxlength="34" value="NO IDENTIFICADO"></label>
        <label class="pf"><span>CARGOS</span><textarea id="pCrime" maxlength="130">ASALTO A LA SUCURSAL 7 DEL BANCO MERIDIANO. APERTURA ILEGAL DE LA CAJA 419.</textarea></label>
        <label class="pf"><span>RECOMPENSA</span><input id="pReward" maxlength="16" value="50.000"></label>
        <label class="pf"><span>PIE / CANAL</span><input id="pFoot" maxlength="30" value="@kazoogod02"></label>
        <label class="pf"><span>FECHA AL PIE</span><input id="pDate" maxlength="24" value="19 · 11 · 2026"></label>

        <div class="drop" id="pDrop" tabindex="0" role="button">
          ARRASTRA UNA FOTO AQUÍ<br>o pulsa para elegirla
        </div>
        <input type="file" id="pFile" accept="image/*" hidden>

        <div class="row">
          <button class="btn hot" id="pDownload" type="button">DESCARGAR PNG</button>
          <button class="btn ghost" id="pClear" type="button">QUITAR FOTO</button>
        </div>
        <p class="t-dim" style="font-size:.57rem;line-height:1.6">
          La imagen no sale de tu navegador: se procesa aquí y se descarga desde aquí.
        </p>
      </div>

      <div class="poster-preview">
        <canvas id="posterCv" width="${W}" height="${H}"></canvas>
      </div>
    </div>`;

  const cv = win.body.querySelector('#posterCv');
  const cx = cv.getContext('2d');
  const q = (s) => win.body.querySelector(s);
  const val = (s) => q(s).value;

  let photo = null;
  let estilo = 'papel';

  /* ── lienzos cacheados ───────────────────────────────── */
  const fondoCv = document.createElement('canvas');
  fondoCv.width = W; fondoCv.height = H;
  const fx = fondoCv.getContext('2d');
  let fondoDe = null;                       // estilo con el que se generó

  const fotoCv = document.createElement('canvas');
  fotoCv.width = PH.w; fotoCv.height = PH.h;
  const px = fotoCv.getContext('2d');
  let fotoDe = null;                        // "estilo|tienePhoto"

  const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  /** Fondo: caro, se hace una vez por estilo. */
  function buildFondo() {
    const E = ESTILOS[estilo];
    fx.fillStyle = E.fondo;
    fx.fillRect(0, 0, W, H);

    if (estilo === 'papel') {
      for (let i = 0; i < 80; i++) {
        const r = 30 + Math.random() * 190;
        const cxp = Math.random() * W, cyp = Math.random() * H;
        const g = fx.createRadialGradient(cxp, cyp, 0, cxp, cyp, r);
        g.addColorStop(0, `rgba(120,88,44,${0.012 + Math.random() * 0.03})`);
        g.addColorStop(1, 'rgba(120,88,44,0)');
        fx.fillStyle = g;
        fx.fillRect(cxp - r, cyp - r, r * 2, r * 2);
      }
      const v = fx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
      v.addColorStop(0, 'rgba(90,62,28,0)');
      v.addColorStop(1, 'rgba(74,48,20,.42)');
      fx.fillStyle = v;
      fx.fillRect(0, 0, W, H);
    } else {
      // halos violeta y rosa
      const g1 = fx.createRadialGradient(W * 0.2, H * 0.18, 0, W * 0.2, H * 0.18, W * 0.8);
      g1.addColorStop(0, 'rgba(201,163,255,.18)');
      g1.addColorStop(1, 'rgba(201,163,255,0)');
      fx.fillStyle = g1; fx.fillRect(0, 0, W, H);
      const g2 = fx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.8);
      g2.addColorStop(0, 'rgba(255,122,208,.16)');
      g2.addColorStop(1, 'rgba(255,122,208,0)');
      fx.fillStyle = g2; fx.fillRect(0, 0, W, H);
      // rejilla
      fx.strokeStyle = 'rgba(201,163,255,.07)';
      fx.lineWidth = 1;
      for (let x = 0; x <= W; x += 45) { fx.beginPath(); fx.moveTo(x, 0); fx.lineTo(x, H); fx.stroke(); }
      for (let y = 0; y <= H; y += 45) { fx.beginPath(); fx.moveTo(0, y); fx.lineTo(W, y); fx.stroke(); }
    }

    // grano
    const img = fx.getImageData(0, 0, W, H), d = img.data;
    const amp = estilo === 'papel' ? 26 : 14;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amp;
      d[i] = cl(d[i] + n); d[i + 1] = cl(d[i + 1] + n); d[i + 2] = cl(d[i + 2] + n);
    }
    fx.putImageData(img, 0, 0);

    if (estilo === 'ficha') {
      fx.fillStyle = 'rgba(0,0,0,.22)';
      for (let y = 0; y < H; y += 4) fx.fillRect(0, y, W, 2);
    }
    fondoDe = estilo;
  }

  /** Retrato tratado: también caro, se rehace sólo al cambiar foto o estilo. */
  function buildFoto() {
    const E = ESTILOS[estilo];
    px.clearRect(0, 0, PH.w, PH.h);

    if (photo) {
      const s = Math.max(PH.w / photo.width, PH.h / photo.height);
      const dw = photo.width * s, dh = photo.height * s;
      px.drawImage(photo, (PH.w - dw) / 2, (PH.h - dh) / 2, dw, dh);

      const img = px.getImageData(0, 0, PH.w, PH.h), d = img.data;
      const [tr, tg, tb] = E.tono;
      for (let i = 0; i < d.length; i += 4) {
        let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        g = cl((g - 128) * 1.45 + 122);
        d[i] = cl(g * tr); d[i + 1] = cl(g * tg); d[i + 2] = cl(g * tb);
      }
      px.putImageData(img, 0, 0);
    } else {
      px.fillStyle = estilo === 'papel' ? 'rgba(70,50,26,.16)' : 'rgba(201,163,255,.08)';
      px.fillRect(0, 0, PH.w, PH.h);
      px.fillStyle = E.suave;
      px.textAlign = 'center';
      px.font = '600 26px "Chakra Petch", sans-serif';
      px.fillText('SIN FOTOGRAFÍA', PH.w / 2, PH.h / 2 - 6);
      px.font = '18px "Share Tech Mono", monospace';
      px.fillText('ARRASTRA UNA IMAGEN', PH.w / 2, PH.h / 2 + 26);
    }

    // trama de impresión
    px.globalAlpha = estilo === 'papel' ? 0.1 : 0.16;
    px.fillStyle = estilo === 'papel' ? '#3a2812' : '#07060c';
    for (let y = 0; y < PH.h; y += 3) for (let x = 0; x < PH.w; x += 3) px.fillRect(x, y, 1, 1);
    px.globalAlpha = 1;

    fotoDe = estilo + '|' + (photo ? '1' : '0');
  }

  /* ── texto ───────────────────────────────────────────── */
  function fit(text, max, start, weight = '700') {
    let size = start;
    do {
      cx.font = `${weight} ${size}px "Chakra Petch", sans-serif`;
      if (cx.measureText(text).width <= max) break;
      size -= 2;
    } while (size > 12);
    return size;
  }

  function wrap(text, max, lineH, y) {
    cx.font = '18px "Share Tech Mono", monospace';
    const words = text.split(/\s+/);
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (cx.measureText(test).width > max && line) { cx.fillText(line, W / 2, yy); line = w; yy += lineH; }
      else line = test;
    }
    if (line) { cx.fillText(line, W / 2, yy); yy += lineH; }
    return yy;
  }

  function render() {
    if (fondoDe !== estilo) buildFondo();
    if (fotoDe !== estilo + '|' + (photo ? '1' : '0')) buildFoto();

    const E = ESTILOS[estilo];
    cx.drawImage(fondoCv, 0, 0);
    cx.textAlign = 'center';

    const rule = (x1, y1, x2, y2, w) => {
      cx.strokeStyle = E.suave; cx.lineWidth = w;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
    };

    // encabezado
    cx.fillStyle = E.tinta;
    cx.font = '400 27px "Share Tech Mono", monospace';
    cx.fillText('KAZOO POLICE DEPARTMENT', W / 2, 74);
    cx.font = '400 17px "Share Tech Mono", monospace';
    cx.fillStyle = E.suave;
    cx.fillText('DIVISIÓN DE CASOS ABIERTOS · EXPEDIENTE 11-19', W / 2, 102);
    rule(60, 124, W - 60, 124, 2);

    // titular
    cx.fillStyle = E.tinta;
    let s = fit('SE BUSCA', W - 120, 148);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText('SE BUSCA', W / 2, 262);

    cx.font = '400 21px "Share Tech Mono", monospace';
    cx.fillStyle = E.suave;
    cx.fillText('VIVO · SE CONSIDERA NO PELIGROSO PERO SÍ INSISTENTE', W / 2, 300);

    // retrato
    cx.drawImage(fotoCv, PH.x, PH.y);
    cx.strokeStyle = E.marco; cx.lineWidth = 3;
    cx.strokeRect(PH.x, PH.y, PH.w, PH.h);

    // alias
    cx.fillStyle = E.tinta;
    const alias = (val('#pAlias') || '').toUpperCase() || '—';
    s = fit(alias, W - 140, 106);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText(alias, W / 2, 880);

    cx.font = '400 20px "Share Tech Mono", monospace';
    cx.fillStyle = E.suave;
    cx.fillText((val('#pName') || '').toUpperCase(), W / 2, 916);
    rule(150, 942, W - 150, 942, 1);

    // cargos
    cx.fillStyle = E.suave;
    let y = wrap((val('#pCrime') || '').toUpperCase(), W - 180, 28, 976);

    // recompensa
    y += 18;
    cx.fillStyle = E.tinta;
    cx.font = '400 20px "Share Tech Mono", monospace';
    cx.fillText('RECOMPENSA', W / 2, y);
    const rw = '$ ' + (val('#pReward') || '0');
    s = fit(rw, W - 200, 70);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText(rw, W / 2, y + 60);

    // pie
    rule(60, H - 128, W - 60, H - 128, 2);
    cx.fillStyle = E.tinta;
    cx.font = '700 30px "Chakra Petch", sans-serif';
    cx.fillText((val('#pDate') || '').toUpperCase(), W / 2, H - 84);
    cx.font = '400 21px "Share Tech Mono", monospace';
    cx.fillStyle = E.suave;
    cx.fillText((val('#pFoot') || '').toUpperCase(), W / 2, H - 52);

    // sello sobre la esquina del retrato
    cx.save();
    cx.translate(W - 205, 748);
    cx.rotate(-0.2);
    cx.strokeStyle = E.sello; cx.lineWidth = 4;
    cx.strokeRect(-96, -30, 192, 60);
    cx.fillStyle = E.sello;
    cx.font = '700 30px "Chakra Petch", sans-serif';
    cx.fillText('EN FUGA', 0, 10);
    cx.restore();
  }

  // un repintado por fotograma como mucho: escribir va fluido
  let pending = 0;
  function requestRender() {
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; render(); });
  }

  /* ── entradas ────────────────────────────────────────── */
  ['#pAlias', '#pName', '#pCrime', '#pReward', '#pFoot', '#pDate']
    .forEach((id) => q(id).addEventListener('input', requestRender));

  q('#pStyle').addEventListener('change', (e) => {
    estilo = e.target.value;
    Sound.blip(700, 0.05);
    requestRender();
  });

  const fileInput = q('#pFile');
  const drop = q('#pDrop');

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('ESO NO ES UNA IMAGEN'); return; }
    if (file.size > 12 * 1024 * 1024) { toast('IMAGEN DEMASIADO GRANDE (MÁX 12 MB)'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photo = img; URL.revokeObjectURL(url);
      fotoDe = null; requestRender();
      Sound.blip(900, 0.05);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('NO SE PUDO LEER LA IMAGEN'); };
    img.src = url;
  }

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));

  q('#pClear').addEventListener('click', () => { photo = null; fotoDe = null; requestRender(); });

  q('#pDownload').addEventListener('click', () => {
    render();                                   // asegura el último estado
    cv.toBlob((blob) => {
      if (!blob) { toast('NO SE PUDO GENERAR EL PNG'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `se-busca-${(val('#pAlias') || 'sujeto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      Sound.fanfare();
      toast('CARTEL DESCARGADO');
    }, 'image/png');
  });

  // sin esperar a las fuentes, el primer dibujo sale con la de reserva
  render();
  (document.fonts?.ready || Promise.resolve()).then(() => { fondoDe = null; fotoDe = null; render(); });
}
