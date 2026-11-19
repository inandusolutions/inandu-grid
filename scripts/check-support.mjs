#!/usr/bin/env node
// Checks that support-matrix.json (the one place the supported Angular, Node and browser versions are written) agrees with everything that
// restates it: package.json `engines`, the library manifest's Angular peers, .nvmrc, the CI workflow and the README tables.
//   npm run check:support
// Not part of the build: it only reads files, so it also runs before anything is built.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

const matrix = json('support-matrix.json');
const problems = [];
const expect = (ok, message) => {
  if (!ok) problems.push(message);
};
/** README tables escape `|` as `\|` and write `>=24` for `>=24.0.0`. */
const plain = (text) => text.replaceAll('\\|', '|').replaceAll('\\', '');
const asWritten = (range) => range.replaceAll('>=24.0.0', '>=24');

// Angular: both peers of the published library, and the README rows
const lib = json('projects/inandu-grid/package.json');
for (const name of ['@angular/core', '@angular/common']) {
  expect(lib.peerDependencies?.[name] === matrix.angular.peer, `projects/inandu-grid/package.json: ${name} peer is "${lib.peerDependencies?.[name]}", the matrix says "${matrix.angular.peer}"`);
}
for (const file of ['README.md', 'projects/inandu-grid/README.md']) {
  expect(plain(read(file)).includes(matrix.angular.peer), `${file} does not mention the Angular range "${matrix.angular.peer}"`);
}

// Node: engines of the workspace, .nvmrc, the README, and the versions CI runs
expect(json('package.json').engines?.node === matrix.node.engines, `package.json: engines.node is "${json('package.json').engines?.node}", the matrix says "${matrix.node.engines}"`);
expect(plain(read('README.md')).includes(asWritten(matrix.node.engines)), `README.md does not mention the Node range "${asWritten(matrix.node.engines)}"`);
const nvmrc = Number.parseInt(read('.nvmrc').trim(), 10);
expect(matrix.node.ci.includes(nvmrc), `.nvmrc pins Node ${nvmrc}, which is not in the matrix's node.ci ${JSON.stringify(matrix.node.ci)}`);
const workflow = read('.github/workflows/ci.yml');
expect(!/node-version:\s*\d/.test(workflow) || [...workflow.matchAll(/node-version:\s*\[?([\d,\s]+)\]?/g)].every((m) => m[1].split(',').every((v) => matrix.node.ci.includes(Number.parseInt(v, 10)))), 'ci.yml sets a node-version that the matrix does not list in node.ci');
expect(workflow.includes('node-version-file: .nvmrc'), 'ci.yml no longer takes its Node version from .nvmrc');

// Browsers: the cross-browser CI matrix is exactly the matrix's list
const projects = workflow.match(/project:\s*\[([^\]]+)\]/)?.[1].split(',').map((p) => p.trim()).filter(Boolean) ?? [];
expect(JSON.stringify([...projects].sort()) === JSON.stringify([...matrix.browsers.e2eCrossBrowser].sort()), `ci.yml cross-browser projects are [${projects.join(', ')}], the matrix says [${matrix.browsers.e2eCrossBrowser.join(', ')}]`);
expect(/\bnpm run e2e\b/.test(workflow), 'ci.yml has no Chromium e2e step (`npm run e2e`)');

// The e2e versions the README claims were checked must include the ones in the matrix
expect(matrix.node.e2eVerified.every((v) => read('README.md').includes(`Node ${v}`) || read('README.md').includes(`and ${v}`)), 'README.md does not mention every Node version in node.e2eVerified');

if (problems.length) {
  problems.forEach((p) => console.error(`error: ${p}`));
  process.exit(1);
}
console.log(`support matrix is consistent: Angular ${matrix.angular.peer}, Node ${asWritten(matrix.node.engines)} (CI ${matrix.node.ci.join('/')}), cross-browser [${projects.join(', ')}]`);
