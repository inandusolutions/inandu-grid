import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

// Runs against the *built* collection (dist/…/schematics) — `npm run test:schematics` builds first.
const collection = join(process.cwd(), 'dist/inandu-grid/schematics/collection.json');
const runner = () => new SchematicTestRunner('inandu-grid', collection);

function emptyAppTree(): HostTree {
  const tree = new HostTree();
  tree.create('/package.json', JSON.stringify({ name: 'demo-app' }));
  return tree;
}

test('grid: creates a standalone component with a working <inandu-grid>', async () => {
  const tree = await runner().runSchematic('grid', {}, emptyAppTree());
  const path = '/src/app/grid-demo/grid-demo.component.ts';
  assert.ok(tree.files.includes(path));

  const content = tree.readContent(path);
  assert.match(content, /selector: 'app-grid-demo'/);
  assert.match(content, /export class GridDemoComponent/);
  assert.match(content, /from '@inandu-solutions\/grid-angular'/);
  assert.match(content, /<inandu-grid/);
  assert.match(content, /<inandu-column/);
});

test('grid: honours a custom name and prefix', async () => {
  const tree = await runner().runSchematic('grid', { name: 'People Table', prefix: 'acme' }, emptyAppTree());
  const path = '/src/app/people-table/people-table.component.ts';
  assert.ok(tree.files.includes(path));
  const content = tree.readContent(path);
  assert.match(content, /selector: 'acme-people-table'/);
  assert.match(content, /export class PeopleTableComponent/);
});

test('grid: refuses to overwrite an existing component', async () => {
  const tree = emptyAppTree();
  tree.create('/src/app/grid-demo/grid-demo.component.ts', '// already here');
  await assert.rejects(runner().runSchematic('grid', {}, tree), /already exists/);
});
