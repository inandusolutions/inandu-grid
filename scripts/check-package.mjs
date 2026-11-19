#!/usr/bin/env node
// Checks the built package the way `npm publish` would ship it (run after `npm run build:lib`):
//   1. `jspdf` is loaded on demand only: no static import or require in the bundle, one dynamic import().
//   2. Size budgets: the library bundle and the packed tarball stay under a ceiling, so growth is a decision, not an accident.
//   3. The tarball has what consumers need (package.json, README, LICENSE, ESM bundle, declarations, schematics) and no sources or specs.
//   4. package.json `exports`/`module`/`typings` point at files that exist, and `sideEffects` stays false (tree-shaking).
//
// Raise a budget in this file when growth is intended; the number in the diff is the review.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist/inandu-grid');

/** Ceilings in bytes. Current values (1.6.0): bundle 227 KB, tarball 147 KB. */
const BUDGET = { bundle: 260 * 1024, tarball: 170 * 1024 };

const failures = [];
const fail = (msg) => failures.push(msg);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

if (!existsSync(dist)) {
  console.error(`error: ${dist} not found, run \`npm run build:lib\` first.`);
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8'));
const bundlePath = join(dist, pkg.module ?? 'fesm2022/inandu-solutions-grid-angular.mjs');

// 0. The version the demo site advertises to search engines (JSON-LD `softwareVersion` in src/index.html) is the version being released.
// It sat at 1.0.0 through five releases because nothing compared it; bump it with the version in projects/inandu-grid/package.json.
const siteVersion = readFileSync(join(root, 'src/index.html'), 'utf8').match(/"softwareVersion"\s*:\s*"([^"]+)"/)?.[1];
if (siteVersion !== pkg.version) fail(`src/index.html says softwareVersion ${siteVersion ?? '(missing)'} but the package is ${pkg.version}: update the JSON-LD block`);

// 1. jspdf on demand
const bundle = readFileSync(bundlePath, 'utf8');
if (/\bfrom\s*["']jspdf["']/.test(bundle) || /\brequire\(\s*["']jspdf["']\s*\)/.test(bundle) || /^\s*import\s+["']jspdf["']/m.test(bundle)) {
  fail('jspdf is imported statically: it would load with the grid instead of on the first PDF export');
}
const dynamic = bundle.match(/\bimport\(\s*["']jspdf["']\s*\)/g) ?? [];
if (dynamic.length !== 1) fail(`expected exactly one dynamic import("jspdf"), found ${dynamic.length}`);
if (pkg.dependencies?.jspdf) fail('jspdf must stay an optional peer dependency, not a dependency');
if (!pkg.peerDependenciesMeta?.jspdf?.optional) fail('jspdf must be marked optional in peerDependenciesMeta');

// 2. size budgets + 3. tarball contents
// `npm_execpath` is set when this runs through an npm script: call npm's own CLI with node, no shell needed on any OS.
const npmArgs = ['pack', dist, '--dry-run', '--json'];
const packOutput = process.env.npm_execpath
  ? execFileSync(process.execPath, [process.env.npm_execpath, ...npmArgs], { cwd: root, encoding: 'utf8' })
  : execFileSync('npm', npmArgs, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const packed = JSON.parse(packOutput)[0];
const bundleSize = statSync(bundlePath).size;
if (bundleSize > BUDGET.bundle) fail(`library bundle is ${kb(bundleSize)}, budget ${kb(BUDGET.bundle)}`);
if (packed.size > BUDGET.tarball) fail(`tarball is ${kb(packed.size)}, budget ${kb(BUDGET.tarball)}`);

const files = packed.files.map((f) => f.path);
for (const required of ['package.json', 'README.md', 'LICENSE', pkg.module, pkg.typings, 'schematics/collection.json']) {
  if (!files.includes(required)) fail(`tarball is missing ${required}`);
}
const stray = files.filter((f) => /\.(spec|test)\.|(^|\/)(src|e2e|node_modules)\//.test(f) || f.endsWith('.ts') && !f.endsWith('.d.ts'));
if (stray.length) fail(`tarball ships files that are not part of the package: ${stray.join(', ')}`);

// 4. entry points exist
const targets = [pkg.module, pkg.typings, pkg.exports?.['.']?.default, pkg.exports?.['.']?.types];
for (const t of targets) {
  if (!t) fail('package.json is missing module/typings/exports["."]');
  else if (!existsSync(join(dist, t))) fail(`package.json points at ${t}, which does not exist`);
}
if (pkg.sideEffects !== false) fail('package.json sideEffects must be false so unused exports tree-shake');

console.log(`bundle ${kb(bundleSize)} / ${kb(BUDGET.bundle)}, tarball ${kb(packed.size)} / ${kb(BUDGET.tarball)}, ${files.length} files, jspdf dynamic imports: ${dynamic.length}`);
if (failures.length) {
  failures.forEach((f) => console.error(`error: ${f}`));
  process.exit(1);
}
console.log('package checks passed');
