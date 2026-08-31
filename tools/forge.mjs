#!/usr/bin/env node
/**
 * forge.mjs — Cifra los fragmentos del expediente.
 *
 * Lee  : tools/plaintexts.json   (SECRETO, nunca se sube)
 * Usa  : tools/master.key        (SECRETO, se genera la primera vez)
 * Crea : assets/fragments.json   (público: solo manifiesto + criptograma)
 *
 * La llave de cada fragmento se deriva del master con HKDF-SHA256.
 * El master no vive en el repositorio: vive en un GitHub Secret.
 * Sin él, el criptograma publicado es indistinguible de ruido.
 *
 *   node tools/forge.mjs
 */
import { randomBytes, hkdfSync, createCipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_PATH = join(ROOT, 'tools', 'master.key');
const HKDF_SALT = 'leonida::19.11.2026';

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
  console.log('  >> Este archivo NO se sube al repositorio. Si lo pierdes,');
  console.log('  >> los fragmentos ya publicados quedan cifrados para siempre.\n');
  return master;
}

/** Deriva la llave AES-256 de un fragmento a partir del master. */
export function deriveKey(master, id) {
  return Buffer.from(
    hkdfSync('sha256', master, Buffer.from(HKDF_SALT), Buffer.from(`leonida/frag/${id}`), 32)
  );
}

const master = loadOrCreateMaster();
const src = JSON.parse(readFileSync(join(ROOT, 'tools', 'plaintexts.json'), 'utf8'));

const out = src.fragments
  .slice()
  .sort((a, b) => new Date(a.unlockAt) - new Date(b.unlockAt))
  .map((f) => {
    const payload = Buffer.from(
      JSON.stringify({ codename: f.codename, body: f.body, clave: f.clave }),
      'utf8'
    );
    const iv = randomBytes(12);
    const key = deriveKey(master, f.id);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);
    return {
      id: f.id,
      unlockAt: f.unlockAt,
      iv: iv.toString('base64'),
      ct: ct.toString('base64'),
    };
  });

const manifest = {
  _aviso: 'Criptograma AES-256-GCM. Las llaves se publican en data/keys.json en su fecha. No hay forma de adelantarlas.',
  algo: 'AES-256-GCM',
  total: out.length,
  forgedAt: new Date().toISOString(),
  fragments: out,
};

writeFileSync(join(ROOT, 'data', 'fragments.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`  Cifrados ${out.length} fragmentos -> data/fragments.json`);
for (const f of out) {
  console.log(`   [${String(f.id).padStart(2, '0')}]  ${f.unlockAt}   ${f.ct.length} B base64`);
}
console.log('\n  Master (para el GitHub Secret LEONIDA_MASTER):');
console.log('  ' + master.toString('hex') + '\n');
