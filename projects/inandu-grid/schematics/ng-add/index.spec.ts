import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

const collection = join(process.cwd(), 'dist/inandu-grid/schematics/collection.json');
const runner = () => new SchematicTestRunner('inandu-grid', collection);

function emptyAppTree(): HostTree {
  const tree = new HostTree();
  tree.create('/package.json', JSON.stringify({ name: 'demo-app' }));
  return tree;
}

test('ng-add: scaffolds the example component by default', async () => {
  const tree = await runner().runSchematic('ng-add', {}, emptyAppTree());
  assert.ok(tree.files.includes('/src/app/grid-demo/grid-demo.component.ts'));
});

test('ng-add: skips the example with skipExample', async () => {
  const tree = await runner().runSchematic('ng-add', { skipExample: true }, emptyAppTree());
  assert.ok(!tree.files.includes('/src/app/grid-demo/grid-demo.component.ts'));
});
