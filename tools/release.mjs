#!/usr/bin/env node
/**
 * release.mjs — Publica las llaves de los fragmentos cuya fecha ya pasó.
 *
 * Se ejecuta a diario desde GitHub Actions con el secreto LEONIDA_MASTER.
 * Deriva la llave de cada fragmento vencido y la escribe en data/keys.json.
 *
 * Antes de su fecha, la llave NO existe en ningún lugar público:
 * ni en el repositorio, ni en el HTML, ni en la memoria del navegador.
 * El cierre temporal es real, no una comprobación de JavaScript.
 *
 *   node tools/release.mjs            # publica lo que corresponda a hoy
 *   node tools/release.mjs --dry      # solo muestra qué haría
 *   node tools/release.mjs --all      # PELIGRO: publica todas (spoilea el expediente)
 */
import { hkdfSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HKDF_SALT = 'leonida::19.11.2026';
const argv = new Set(process.argv.slice(2));

function readMaster() {
  const fromEnv = (process.env.LEONIDA_MASTER || '').trim();
  if (fromEnv) return Buffer.from(fromEnv, 'hex');
  const p = join(ROOT, 'tools', 'master.key');
  if (existsSync(p)) return Buffer.from(readFileSync(p, 'utf8').trim(), 'hex');
  console.error('ERROR: falta el master. Define LEONIDA_MASTER o crea tools/master.key.');
  process.exit(1);
}

const master = readMaster();
if (master.length !== 32) {
  console.error('ERROR: el master debe medir 32 bytes (64 caracteres hex).');
  process.exit(1);
}

const deriveKey = (id) =>
  Buffer.from(hkdfSync('sha256', master, Buffer.from(HKDF_SALT), Buffer.from(`leonida/frag/${id}`), 32));

const manifest = JSON.parse(readFileSync(join(ROOT, 'data', 'fragments.json'), 'utf8'));
const keysPath = join(ROOT, 'data', 'keys.json');
const existing = existsSync(keysPath) ? JSON.parse(readFileSync(keysPath, 'utf8')) : { keys: {} };
const keys = existing.keys || {};

const now = Date.now();
const added = [];

for (const f of manifest.fragments) {
  const due = argv.has('--all') || new Date(f.unlockAt).getTime() <= now;
  if (!due || keys[f.id]) continue;
  if (!argv.has('--dry')) keys[f.id] = deriveKey(f.id).toString('base64');
  added.push(f.id);
}

const pending = manifest.fragments.filter((f) => !keys[f.id]).map((f) => f.unlockAt).sort();

if (argv.has('--dry')) {
  console.log(added.length ? `Publicaría: ${added.join(', ')}` : 'Nada por publicar.');
  process.exit(0);
}

if (!added.length) {
  console.log('::notice::Sin cambios. Próximo descifrado: ' + (pending[0] || 'ninguno, expediente completo.'));
  process.exit(0);
}

writeFileSync(
  keysPath,
  JSON.stringify(
    { _aviso: 'Llaves liberadas por fecha. Publicadas automáticamente; no se pueden adelantar.', updatedAt: new Date().toISOString(), keys },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`::notice::Descifrado publicado para fragmento(s): ${added.join(', ')}`);
console.log('CHANGED=1');
