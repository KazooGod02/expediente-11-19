/* ════════════════════════════════════════════════════════════
   poster.js — generador de carteles de búsqueda
   Todo se dibuja en un canvas: papel envejecido, foto tratada
   y descarga en PNG lista para publicar.
   ════════════════════════════════════════════════════════════ */
import { Win, Sound, toast } from './core.js';

const W = 900, H = 1270;

export function openPoster(ctx) {
  const win = Win.open({ id: 'poster', title: 'CARTEL DE BÚSQUEDA — generador', w: 880, h: 640 });
  if (win.body.dataset.built) return;
  win.body.dataset.built = '1';

  win.body.innerHTML = `
    <div class="poster-grid">
      <div>
        <label class="pf"><span>ALIAS</span><input id="pAlias" maxlength="18" value="KAZOO"></label>
        <label class="pf"><span>NOMBRE EN EL EXPEDIENTE</span><input id="pName" maxlength="34" value="SUJETO NO IDENTIFICADO"></label>
        <label class="pf"><span>CARGOS</span><textarea id="pCrime" maxlength="120">ASALTO A LA SUCURSAL 7 DEL BANCO MERIDIANO. APERTURA ILEGAL DE LA CAJA 419.</textarea></label>
        <label class="pf"><span>RECOMPENSA</span><input id="pReward" maxlength="16" value="50.000"></label>
        <label class="pf"><span>PIE / CANAL</span><input id="pFoot" maxlength="30" value="@kazoogod02"></label>
        <label class="pf"><span>FECHA AL PIE</span><input id="pDate" maxlength="24" value="19 · 11 · 2026"></label>

        <div class="drop" id="pDrop" tabindex="0" role="button">
          ARRASTRA UNA FOTO AQUÍ<br>o pulsa para elegirla
        </div>
        <input type="file" id="pFile" accept="image/*" hidden>

        <div class="row">
          <button class="btn" id="pDownload" type="button">DESCARGAR PNG</button>
          <button class="btn ghost" id="pClear" type="button">QUITAR FOTO</button>
        </div>
        <p class="t-dim" style="font-size:.58rem;line-height:1.6">
          La imagen no sale de tu navegador: se procesa aquí y se descarga desde aquí.
        </p>
      </div>

      <div class="poster-preview">
        <canvas id="posterCv" width="${W}" height="${H}"></canvas>
      </div>
    </div>`;

  const cv = win.body.querySelector('#posterCv');
  const cx = cv.getContext('2d');
  let photo = null;

  const val = (id) => win.body.querySelector(id).value;

  /* ── papel envejecido ── */
  function paper() {
    cx.fillStyle = '#d8c49a';
    cx.fillRect(0, 0, W, H);

    // manchas
    for (let i = 0; i < 90; i++) {
      const r = 30 + Math.random() * 190;
      const g = cx.createRadialGradient(Math.random() * W, Math.random() * H, 0,
        Math.random() * W, Math.random() * H, r);
      g.addColorStop(0, `rgba(120,88,44,${0.012 + Math.random() * 0.03})`);
      g.addColorStop(1, 'rgba(120,88,44,0)');
      cx.fillStyle = g;
      cx.fillRect(0, 0, W, H);
    }

    // quemado de bordes
    const v = cx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    v.addColorStop(0, 'rgba(90,62,28,0)');
    v.addColorStop(1, 'rgba(74,48,20,.42)');
    cx.fillStyle = v;
    cx.fillRect(0, 0, W, H);

    // grano
    const img = cx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    cx.putImageData(img, 0, 0);
  }

  /* ── foto tratada: alto contraste, monocroma, virada a sepia ── */
  function drawPhoto(x, y, w, h) {
    cx.save();
    cx.beginPath(); cx.rect(x, y, w, h); cx.clip();

    if (photo) {
      const s = Math.max(w / photo.width, h / photo.height);
      const dw = photo.width * s, dh = photo.height * s;
      cx.drawImage(photo, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);

      const img = cx.getImageData(x, y, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        g = clamp255((g - 128) * 1.45 + 122);           // contraste
        d[i] = clamp255(g * 1.06);                       // virado cálido
        d[i + 1] = clamp255(g * 0.94);
        d[i + 2] = clamp255(g * 0.72);
      }
      cx.putImageData(img, x, y);
    } else {
      cx.fillStyle = 'rgba(70,50,26,.16)';
      cx.fillRect(x, y, w, h);
      cx.fillStyle = 'rgba(60,42,20,.42)';
      cx.font = '600 26px "Chakra Petch", sans-serif';
      cx.textAlign = 'center';
      cx.fillText('SIN FOTOGRAFÍA', x + w / 2, y + h / 2 - 6);
      cx.font = '18px "Share Tech Mono", monospace';
      cx.fillText('ARRASTRA UNA IMAGEN', x + w / 2, y + h / 2 + 26);
    }

    // trama de puntos, como impresión antigua
    cx.globalAlpha = 0.10;
    cx.fillStyle = '#3a2812';
    for (let py = y; py < y + h; py += 3) {
      for (let px = x; px < x + w; px += 3) cx.fillRect(px, py, 1, 1);
    }
    cx.globalAlpha = 1;

    cx.restore();

    cx.strokeStyle = 'rgba(58,40,18,.75)';
    cx.lineWidth = 3;
    cx.strokeRect(x, y, w, h);
  }

  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  function fitText(text, max, start, weight = '700', family = '"Chakra Petch", sans-serif') {
    let size = start;
    do {
      cx.font = `${weight} ${size}px ${family}`;
      if (cx.measureText(text).width <= max) break;
      size -= 2;
    } while (size > 12);
    return size;
  }

  function wrap(text, max, lineH, y, size) {
    cx.font = `18px "Share Tech Mono", monospace`;
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
    paper();
    cx.textAlign = 'center';
    const ink = '#3a2812';

    // encabezado
    cx.fillStyle = ink;
    cx.font = '400 26px "Share Tech Mono", monospace';
    cx.fillText('OFICINA DE INVESTIGACIÓN CRIMINAL', W / 2, 74);
    cx.font = '400 17px "Share Tech Mono", monospace';
    cx.fillStyle = 'rgba(58,40,18,.72)';
    cx.fillText('DIVISIÓN DE CASOS ABIERTOS · EXPEDIENTE 11-19', W / 2, 102);

    line(60, 124, W - 60, 124, 2);

    // SE BUSCA
    cx.fillStyle = ink;
    let s = fitText('SE BUSCA', W - 120, 148);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText('SE BUSCA', W / 2, 262);

    cx.font = '400 22px "Share Tech Mono", monospace';
    cx.fillStyle = 'rgba(58,40,18,.7)';
    cx.fillText('VIVO · SE CONSIDERA NO PELIGROSO PERO SÍ INSISTENTE', W / 2, 300);

    // retrato
    drawPhoto((W - 460) / 2, 330, 460, 460);

    // alias
    cx.fillStyle = ink;
    const alias = (val('#pAlias') || '').toUpperCase() || '—';
    s = fitText(alias, W - 140, 108);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText(alias, W / 2, 880);

    cx.font = '400 20px "Share Tech Mono", monospace';
    cx.fillStyle = 'rgba(58,40,18,.78)';
    cx.fillText((val('#pName') || '').toUpperCase(), W / 2, 916);

    line(150, 942, W - 150, 942, 1);

    // cargos
    cx.fillStyle = 'rgba(58,40,18,.85)';
    let y = wrap((val('#pCrime') || '').toUpperCase(), W - 180, 28, 976, 18);

    // recompensa
    y += 16;
    cx.fillStyle = ink;
    cx.font = '400 20px "Share Tech Mono", monospace';
    cx.fillText('RECOMPENSA', W / 2, y);
    s = fitText('$ ' + (val('#pReward') || '0'), W - 200, 72);
    cx.font = `700 ${s}px "Chakra Petch", sans-serif`;
    cx.fillText('$ ' + (val('#pReward') || '0'), W / 2, y + 62);

    // pie
    line(60, H - 128, W - 60, H - 128, 2);
    cx.font = '700 30px "Chakra Petch", sans-serif';
    cx.fillStyle = ink;
    cx.fillText((val('#pDate') || '').toUpperCase(), W / 2, H - 84);
    cx.font = '400 21px "Share Tech Mono", monospace';
    cx.fillStyle = 'rgba(58,40,18,.72)';
    cx.fillText((val('#pFoot') || '').toUpperCase(), W / 2, H - 52);

    // sello inclinado
    cx.save();
    cx.translate(W - 158, 170);
    cx.rotate(-0.22);
    cx.strokeStyle = 'rgba(150,40,28,.5)';
    cx.lineWidth = 4;
    cx.strokeRect(-92, -34, 184, 68);
    cx.fillStyle = 'rgba(150,40,28,.5)';
    cx.font = '700 30px "Chakra Petch", sans-serif';
    cx.textAlign = 'center';
    cx.fillText('EN FUGA', 0, 11);
    cx.restore();

    function line(x1, y1, x2, y2, w) {
      cx.strokeStyle = 'rgba(58,40,18,.55)';
      cx.lineWidth = w;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
    }
  }

  /* ── entradas ── */
  const inputs = ['#pAlias', '#pName', '#pCrime', '#pReward', '#pFoot', '#pDate'];
  inputs.forEach((id) => win.body.querySelector(id).addEventListener('input', render));

  const fileInput = win.body.querySelector('#pFile');
  const drop = win.body.querySelector('#pDrop');

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('ESO NO ES UNA IMAGEN'); return; }
    if (file.size > 12 * 1024 * 1024) { toast('IMAGEN DEMASIADO GRANDE (MÁX 12 MB)'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { photo = img; URL.revokeObjectURL(url); render(); Sound.blip(900, 0.05); };
    img.onerror = () => { URL.revokeObjectURL(url); toast('NO SE PUDO LEER LA IMAGEN'); };
    img.src = url;
  }

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));

  win.body.querySelector('#pClear').addEventListener('click', () => { photo = null; render(); });

  win.body.querySelector('#pDownload').addEventListener('click', () => {
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

  // las fuentes tienen que estar listas o el primer render sale con la de reserva
  (document.fonts?.ready || Promise.resolve()).then(render);
  render();
}
