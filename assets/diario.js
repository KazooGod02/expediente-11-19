/* ════════════════════════════════════════════════════════════
   diario.js — PARTE DIARIO

   Un despacho por día, cifrado igual que el expediente: la llave
   de cada día se publica ese día. El ritmo es irregular a
   propósito — hay días con tres tareas y días en los que la
   central sólo se queja del café.
   ════════════════════════════════════════════════════════════ */
import { $, pad, wait, b64, store, Sound, Win, toast, notify, typeInto, REDUCED } from './core.js';

const NIVELES = ['SIN NOVEDAD', 'RUTINA', 'ACTIVIDAD', 'ALERTA'];

/** Fecha local en formato AAAA-MM-DD (no UTC: el parte es del día del agente). */
export function hoyLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const fmtLargo = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).toUpperCase();
};

export const Diario = {
  manifest: null,
  abiertos: new Map(),                 // fecha -> entrada descifrada
  hechas: new Set(store.get('tareas', [])),
  vistos: new Set(store.get('partesVistos', [])),
  viendo: null,                        // fecha que se está mirando

  async load(keysDias) {
    if (!this.manifest) {
      try {
        const bust = '?v=' + Math.floor(Date.now() / 600000);
        this.manifest = await fetch('data/diario.json' + bust).then((r) => r.json());
      } catch { return false; }
    }
    const hoy = hoyLocal();
    for (const d of this.manifest.dias) {
      if (this.abiertos.has(d.d)) continue;
      const kb = keysDias?.[d.d];
      // sólo se lee lo que ya toca en la fecha local del agente
      if (!kb || d.d > hoy) continue;
      try {
        const key = await crypto.subtle.importKey('raw', b64(kb), 'AES-GCM', false, ['decrypt']);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(d.iv) }, key, b64(d.ct));
        this.abiertos.set(d.d, JSON.parse(new TextDecoder().decode(pt)));
      } catch { /* llave inválida: sigue cerrado */ }
    }
    return true;
  },

  /** Los días legibles, del más reciente al más antiguo. */
  get fechas() { return [...this.abiertos.keys()].sort().reverse(); },
  get hoy() { const h = hoyLocal(); return this.abiertos.has(h) ? h : this.fechas[0] || null; },

  entrada(fecha) { return this.abiertos.get(fecha) || null; },

  hecha(id) { return this.hechas.has(id); },

  completar(id) {
    if (this.hechas.has(id)) return false;
    this.hechas.add(id);
    store.set('tareas', [...this.hechas]);
    return true;
  },

  /** Tareas pendientes del día que se está viviendo. */
  pendientesHoy() {
    const e = this.entrada(this.hoy);
    if (!e || !e.t) return 0;
    return e.t.filter((t) => !this.hechas.has(t.id)).length;
  },

  sinVer() {
    const h = this.hoy;
    return h ? !this.vistos.has(h) : false;
  },

  marcarVisto(fecha) {
    if (!fecha || this.vistos.has(fecha)) return;
    this.vistos.add(fecha);
    store.set('partesVistos', [...this.vistos]);
  },

  /**
   * Aviso desde el resto de la app: se ha hecho algo que puede
   * cerrar una tarea. Devuelve las tareas recién completadas.
   */
  notificar(kind, value) {
    const cerradas = [];
    for (const [, e] of this.abiertos) {
      for (const t of e.t || []) {
        if (this.hechas.has(t.id)) continue;
        if (t.k !== kind) continue;
        if (String(t.v) !== String(value)) continue;
        this.completar(t.id);
        cerradas.push(t);
      }
    }
    return cerradas;
  },
};

/* ─────────────────────────────────────────────────────────────
   ventana
   ───────────────────────────────────────────────────────────── */
let onTarea = null;
export function setTareaHandler(fn) { onTarea = fn; }

export function openDiario(fecha) {
  const win = Win.open({ id: 'diario', title: 'PARTE DIARIO — K.P.D.', w: 560, h: 500 });
  Diario.viendo = fecha || Diario.viendo || Diario.hoy;
  render(win.body);
}

export function refreshDiarioIfOpen() {
  const w = Win.get('diario');
  if (w) render(w.body);
}

async function render(body) {
  const fecha = Diario.viendo;
  const e = Diario.entrada(fecha);

  if (!e) {
    body.innerHTML = `<p class="t-dim" style="font-size:.7rem;line-height:1.8">
      El parte de hoy todavía no ha bajado del archivo central.<br>
      Vuelva en un rato, agente.</p>`;
    return;
  }

  const esHoy = fecha === Diario.hoy;
  const nuevo = !Diario.vistos.has(fecha);
  Diario.marcarVisto(fecha);

  const fechas = Diario.fechas;
  const idx = fechas.indexOf(fecha);
  const hayAnterior = idx < fechas.length - 1;
  const haySiguiente = idx > 0;

  body.innerHTML = `
    <div class="dia">
      <div class="dia-head">
        <div>
          <p class="dia-fecha">${fmtLargo(fecha)}${esHoy ? ' · HOY' : ''}</p>
          <p class="dia-sub">PARTE DIARIO · DIVISIÓN DE CASOS ABIERTOS</p>
        </div>
        <span class="dia-nivel n${e.n}">${NIVELES[e.n]}</span>
      </div>
      <div class="dia-parte" id="diaParte"></div>
      <div id="diaTareas"></div>
      <div class="dia-nav">
        <button class="btn ghost" id="diaPrev" type="button" ${hayAnterior ? '' : 'disabled'}>‹ ANTERIOR</button>
        <span class="t-dim">${fechas.length} parte${fechas.length === 1 ? '' : 's'} en el archivo</span>
        <button class="btn ghost" id="diaNext" type="button" ${haySiguiente ? '' : 'disabled'}>SIGUIENTE ›</button>
      </div>
    </div>`;

  body.querySelector('#diaPrev').addEventListener('click', () => { openDiario(fechas[idx + 1]); });
  body.querySelector('#diaNext').addEventListener('click', () => { openDiario(fechas[idx - 1]); });

  renderTareas(body, e);

  // el despacho se teclea sólo la primera vez que se lee
  const cont = body.querySelector('#diaParte');
  for (const line of e.p) {
    const p = document.createElement('p');
    cont.appendChild(p);
    if (nuevo && !REDUCED) { await typeInto(p, line, 6); await wait(50); }
    else p.textContent = line;
  }
}

function renderTareas(body, e) {
  const zona = body.querySelector('#diaTareas');
  if (!zona) return;
  const tareas = e.t || [];

  if (!tareas.length) {
    zona.innerHTML = `<p class="dia-sintareas">Sin tareas asignadas para hoy.</p>`;
    return;
  }

  const pend = tareas.filter((t) => !Diario.hecha(t.id)).length;
  zona.innerHTML = `
    <p class="dia-tlabel">TAREAS · ${tareas.length - pend}/${tareas.length} COMPLETADAS</p>
    <ul class="dia-tareas">${tareas.map((t) => {
      const ok = Diario.hecha(t.id);
      return `<li class="tarea ${ok ? 'ok' : ''}" data-id="${t.id}" data-k="${t.k}" data-v="${t.v ?? ''}"
        ${t.k === 'ack' && !ok ? 'tabindex="0" role="button"' : ''}>
        <span class="tick">${ok ? '✓' : '·'}</span>
        <span class="txt">${t.x}</span>
        ${t.ob ? '<span class="ob">OBLIGATORIA</span>' : ''}
      </li>`;
    }).join('')}</ul>`;

  // las de tipo 'ack' se marcan a mano; el resto se cierran solas al hacer la acción
  zona.querySelectorAll('.tarea[data-k="ack"]').forEach((li) => {
    const hacer = () => {
      if (Diario.hecha(li.dataset.id)) return;
      Diario.completar(li.dataset.id);
      Sound.blip(880, 0.06, 0.07);
      toast('TAREA REGISTRADA');
      onTarea?.();
      refreshDiarioIfOpen();
    };
    li.addEventListener('click', hacer);
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); hacer(); }
    });
  });

  // las demás son clicables como atajo: llevan a donde hay que ir
  zona.querySelectorAll('.tarea:not([data-k="ack"])').forEach((li) => {
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => onTarea?.(li.dataset.k, li.dataset.v));
  });
}

/** Avisa de las tareas que se acaban de cerrar solas. */
export function avisarTareas(cerradas) {
  if (!cerradas.length) return;
  Sound.blip(940, 0.07, 0.07);
  toast(cerradas.length === 1
    ? 'TAREA COMPLETADA · ' + cerradas[0].x.toUpperCase()
    : `${cerradas.length} TAREAS COMPLETADAS`);
  refreshDiarioIfOpen();
}
