#!/usr/bin/env node
/**
 * forge.mjs — Sella el expediente y los partes diarios.
 *
 * Lee  : tools/plaintexts.json   (SECRETO — las 8 partes del caso)
 *        tools/diario.mjs        (SECRETO — los 82 partes diarios)
 * Usa  : tools/master.key        (SECRETO — se genera la primera vez)
 * Crea : data/fragments.json     (público: manifiesto + criptograma)
 *        data/diario.json        (público: manifiesto + criptograma)
 *
 * La llave de cada pieza se deriva del master con HKDF-SHA256.
 * El master no vive en el repositorio: vive en un GitHub Secret.
 * Sin él, lo publicado es indistinguible de ruido.
 *
 *   node tools/forge.mjs
 */
import { randomBytes, hkdfSync, createCipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIAS } from './diario.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_PATH = join(ROOT, 'tools', 'master.key');
const HKDF_SALT = 'oic::expediente-11-19';

function loadOrCreateMaster() {
  if (existsSync(MASTER_PATH)) {
    const hex = readFileSync(MASTER_PATH, 'utf8').trim();
    if (!/^[0-9a-f]{64}$/i.test(hex)) {
      throw new Error('tools/master.key corrupto: se esperaban 64 caracteres hex.');
    }
    return Buffer.from(hex, 'hex');
  }
  const master = randomBytes(32);
  writeFileSync(MASTER_PATH, master.toString('hex') + '\n', 'utf8');
  console.log('\n  >> MASTER NUEVO GENERADO en tools/master.key');
  console.log('  >> Este archivo NO se sube. Si lo pierdes, lo ya publicado');
  console.log('  >> queda cifrado para siempre.\n');
  return master;
}

/** Deriva la llave AES-256 de una pieza. `info` la identifica de forma única. */
export function deriveKey(master, info) {
  return Buffer.from(
    hkdfSync('sha256', master, Buffer.from(HKDF_SALT), Buffer.from(info), 32)
  );
}

/** Cifra cualquier objeto con la llave dada. La etiqueta va pegada al final. */
function sellar(payload, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const buf = Buffer.from(JSON.stringify(payload), 'utf8');
  const ct = Buffer.concat([cipher.update(buf), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64') };
}

const master = loadOrCreateMaster();

/* ── el expediente: 8 partes ─────────────────────────────── */
const src = JSON.parse(readFileSync(join(ROOT, 'tools', 'plaintexts.json'), 'utf8'));

const fragments = src.fragments
  .slice()
  .sort((a, b) => new Date(a.unlockAt) - new Date(b.unlockAt))
  .map((f) => ({
    id: f.id,
    unlockAt: f.unlockAt,
    ...sellar(
      { codename: f.codename, body: f.body, clave: f.clave },
      deriveKey(master, `oic/parte/${f.id}`)
    ),
  }));

writeFileSync(
  join(ROOT, 'data', 'fragments.json'),
  JSON.stringify({
    _aviso: 'Criptograma AES-256-GCM. Las llaves se publican en data/keys.json en su fecha. No hay forma de adelantarlas.',
    algo: 'AES-256-GCM',
    total: fragments.length,
    forgedAt: new Date().toISOString(),
    fragments,
  }, null, 2) + '\n',
  'utf8'
);

console.log(`  Cifradas ${fragments.length} partes del expediente -> data/fragments.json`);
for (const f of fragments) {
  console.log(`   [${String(f.id).padStart(2, '0')}]  ${f.unlockAt}   ${f.ct.length} B base64`);
}

/* ── el parte diario: 82 días ────────────────────────────── */
const dias = Object.entries(DIAS)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([fecha, entrada]) => ({
    d: fecha,
    unlockAt: `${fecha}T00:00:00Z`,
    ...sellar(entrada, deriveKey(master, `oic/dia/${fecha}`)),
  }));

writeFileSync(
  join(ROOT, 'data', 'diario.json'),
  JSON.stringify({
    _aviso: 'Partes diarios cifrados. Cada llave se publica el día que le toca.',
    algo: 'AES-256-GCM',
    total: dias.length,
    desde: dias[0].d,
    hasta: dias[dias.length - 1].d,
    dias,
  }, null, 2) + '\n',
  'utf8'
);

console.log(`\n  Cifrados ${dias.length} partes diarios -> data/diario.json`);
console.log(`   ${dias[0].d} .. ${dias[dias.length - 1].d}`);

console.log('\n  Master (para el GitHub Secret OIC_MASTER):');
console.log('  ' + master.toString('hex') + '\n');
