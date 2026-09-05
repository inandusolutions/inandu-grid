/**
 * Builds the library's schematics into `dist/inandu-grid/schematics/`:
 *   1. `tsc` the `.ts` sources to CommonJS
 *   2. copy the non-TS assets ng-packagr doesn't know about — `collection.json`, every
 *      `schema.json`, and the `files/` templates
 *
 * Run after `ng build inandu-grid` (see the root `build:lib` script). Zero dependencies.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distRoot = join(here, '../../../dist/inandu-grid');
const outDir = join(distRoot, 'schematics');
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

execFileSync(process.execPath, [tsc, '-p', join(here, 'tsconfig.json')], { stdio: 'inherit' });

// ng-packagr stamps `"type": "module"` on the package root. The schematics are CommonJS (that's
// what the Angular CLI's schematic engine loads), so a nested marker keeps Node from treating
// their .js as ESM — for the published package and for `test:schematics` alike.
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');

// ...but ng-packagr also writes a `.npmignore` with `**/package.json`, which would strip that
// marker from the published tarball. Re-include it (and future nested markers under schematics/).
const npmignore = join(distRoot, '.npmignore');
if (existsSync(npmignore) && !readFileSync(npmignore, 'utf8').includes('!schematics/**/package.json')) {
  appendFileSync(npmignore, '\n# keep the CommonJS marker(s) for the schematics\n!schematics/package.json\n!schematics/**/package.json\n');
}

/** Walk `dir` and copy every file matching `keep(relPath)` into the mirrored spot under `outDir`. */
function copyAssets(dir, keep) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(here, abs);
    if (statSync(abs).isDirectory()) {
      copyAssets(abs, keep);
    } else if (keep(rel, entry)) {
      const dest = join(outDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(abs, dest);
    }
  }
}

copyAssets(
  here,
  (rel, name) =>
    name === 'collection.json' ||
    name === 'schema.json' ||
    rel.split(/[\\/]/).includes('files'),
);

console.log('schematics: built to dist/inandu-grid/schematics/');
