// GERIMIS — the make.fun hand-in program.
//
// What it does, in order:
//   1. wipes the output directory, so two runs produce identical bytes;
//   2. mirrors game/ and screenshots/ into it;
//   3. asks the kit's own buildDossier to describe that tree, exactly as
//      the scorer will build it, and writes the result as dossier.json;
//   4. refuses to hand in a dossier over the 1.5 MiB gate — failing here,
//      loudly, beats failing at the scorer with no message.
// Node 22, standard library only; the kit module is the one import.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const DOSSIER_CAP_BYTES = 1.5 * 1024 * 1024; // the gate's hard ceiling

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const part of ['game', 'screenshots']) {
  cpSync(join(repoRoot, part), join(outDir, part), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

if (dossier.length > DOSSIER_CAP_BYTES) {
  throw new Error(`dossier.json would be ${dossier.length} bytes — over the 1.5 MiB cap`);
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

const kib = (dossier.length / 1024).toFixed(1);
console.log(`GERIMIS handed in: dossier ${kib} KiB, contact sheet of 4 screenshots, output at ${outDir}`);
