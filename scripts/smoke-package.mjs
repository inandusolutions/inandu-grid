#!/usr/bin/env node
// Release smoke test: installs the *packed tarball* (what `npm publish` would upload, not the source tree) into an empty
// project and checks that a consumer can use it:
//   1. `npm install` resolves the package with only its declared peers (Angular, TypeScript at the repo's versions).
//   2. A standalone component using <inandu-grid> / <inandu-column> compiles with the Angular AOT compiler (ngc) under
//      strict TypeScript and strictTemplates, so a broken `exports` map, bad declarations or a missing peer fails here.
//   3. The ESM entry point can be imported by Node and exposes the grid components.
// Run after `npm run build:lib`:  npm run smoke:package
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist/inandu-grid');
if (!existsSync(dist)) {
  console.error(`error: ${dist} not found, run \`npm run build:lib\` first.`);
  process.exit(2);
}

const version = (name) => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
const work = mkdtempSync(join(tmpdir(), 'grid-smoke-'));
const npmCli = process.env.npm_execpath;
const run = (cmd, args, cwd, shell = false) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell });
// Through npm scripts npm_execpath is set and npm's own CLI is called with node; run directly, npm.cmd needs a shell on Windows.
const npm = (args, cwd) => (npmCli ? run(process.execPath, [npmCli, ...args], cwd) : run('npm', args, cwd, process.platform === 'win32'));

try {
  // pack the built package, exactly as published
  const packDir = join(work, 'pack');
  mkdirSync(packDir);
  const packName = JSON.parse(npm(['pack', dist, '--pack-destination', packDir, '--json'], root))[0].filename;
  const tarball = join(packDir, packName);
  console.log(`packed ${packName}`);

  // empty consumer project: Angular and TypeScript at the versions this repo develops against
  const app = join(work, 'consumer');
  mkdirSync(join(app, 'src'), { recursive: true });
  const ng = version('@angular/core');
  const deps = Object.fromEntries(['@angular/common', '@angular/compiler', '@angular/core', '@angular/platform-browser'].map((n) => [n, ng]));
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: 'grid-smoke-consumer',
        private: true,
        type: 'module',
        dependencies: { ...deps, 'rxjs': version('rxjs'), '@inandu-solutions/grid-angular': `file:${tarball.replaceAll('\\', '/')}` },
        devDependencies: { '@angular/compiler-cli': version('@angular/compiler-cli'), typescript: version('typescript') },
      },
      null,
      2,
    ),
  );
  // Two consumers: the Angular CLI default (skipLibCheck on, no jspdf installed) and a strict one (skipLibCheck off, jspdf installed
  // because the declarations of grid-core reference its types).
  const tsconfig = (skipLibCheck) =>
    JSON.stringify(
      {
        compilerOptions: { target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', strict: true, noEmit: true, skipLibCheck, experimentalDecorators: true, lib: ['ES2022', 'dom'] },
        angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true },
        files: ['src/main.ts'],
      },
      null,
      2,
    );
  writeFileSync(join(app, 'tsconfig.json'), tsconfig(true));
  writeFileSync(join(app, 'tsconfig.strict.json'), tsconfig(false));
  writeFileSync(
    join(app, 'src/main.ts'),
    `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InanduColumnComponent, InanduGridComponent, InanduGridRow } from '@inandu-solutions/grid-angular';

@Component({
  selector: 'smoke-app',
  imports: [InanduGridComponent, InanduColumnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <inandu-grid [data]="rows" filter="true" exportable="true" selectable="true" lang="en" height="300">
      <inandu-column title="Name" field="name" sortable="true"></inandu-column>
      <inandu-column title="Units" field="units" type="number" aggregate="sum"></inandu-column>
    </inandu-grid>
  \`,
})
export class SmokeApp {
  readonly rows: InanduGridRow[] = [{ name: 'Alice', units: 1 }];
}
`,
  );

  console.log('npm install (consumer)...');
  npm(['install', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error'], app);

  const ngc = (project) => run(process.execPath, [join(app, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'), '-p', project], app);
  console.log('ngc (AOT, strict templates, skipLibCheck on, no jspdf)...');
  ngc('tsconfig.json');

  console.log('ngc (AOT, strict templates, skipLibCheck off, jspdf installed)...');
  npm(['install', '--no-save', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error', `jspdf@${version('jspdf')}`], app);
  ngc('tsconfig.strict.json');

  console.log('node import...');
  // Angular's partially compiled output needs the JIT compiler when it runs outside a build (as it does here, in plain Node).
  const check = `await import('@angular/compiler'); const m = await import('@inandu-solutions/grid-angular'); if (!m.InanduGridComponent || !m.InanduColumnComponent) { throw new Error('components are not exported'); } console.log('exports: ' + Object.keys(m).length);`;
  process.stdout.write(run(process.execPath, ['--input-type=module', '-e', check], app));

  const leftover = readdirSync(join(app, 'node_modules/@inandu-solutions/grid-angular'));
  console.log(`installed files: ${leftover.join(', ')}`);
  console.log('smoke test passed');
} finally {
  rmSync(work, { recursive: true, force: true });
}
