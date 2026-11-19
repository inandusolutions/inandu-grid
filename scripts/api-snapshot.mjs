#!/usr/bin/env node
// Public API snapshot: lists everything the built package exports (names, kinds, and for classes/interfaces/enums their
// public members with types) and compares it with the committed api/public-api.txt.
//
//   npm run api:check     fails when the built declarations differ from the snapshot (run after `npm run build:lib`)
//   npm run api:update    rewrites the snapshot; review the diff, it is the API change of the release
//
// A removed or retyped export/member is a breaking change (semver major); an added one is a minor. The snapshot makes that
// visible in the pull request instead of in a consumer's build. No dependency beyond `typescript`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dts = join(root, 'dist/inandu-grid/types/inandu-solutions-grid-angular.d.ts');
const snapshotFile = join(root, 'api/public-api.txt');
const update = process.argv.includes('--update');

if (!existsSync(dts)) {
  console.error(`error: ${dts} not found, run \`npm run build:lib\` first.`);
  process.exit(2);
}

const program = ts.createProgram([dts], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(dts);
const moduleSymbol = checker.getSymbolAtLocation(source);

const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const typeText = (type, node) => checker.typeToString(type, node, flags).replace(/\s+/g, ' ');

function isPublic(symbol) {
  const decl = symbol.declarations?.[0];
  if (!decl) return true;
  const mods = ts.getCombinedModifierFlags(decl);
  return !(mods & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected));
}

function members(symbol, node) {
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  return checker
    .getPropertiesOfType(type)
    .filter(isPublic)
    .filter((p) => !p.name.startsWith('ɵ') && !p.name.startsWith('_'))
    .map((p) => {
      const optional = p.flags & ts.SymbolFlags.Optional ? '?' : '';
      const readonly = (p.declarations?.[0] && ts.getCombinedModifierFlags(p.declarations[0]) & ts.ModifierFlags.Readonly) ? 'readonly ' : '';
      return `  ${readonly}${p.name}${optional}: ${typeText(checker.getTypeOfSymbolAtLocation(p, node), node)}`;
    })
    .sort();
}

const lines = [];
for (const exp of checker.getExportsOfModule(moduleSymbol).sort((a, b) => a.name.localeCompare(b.name))) {
  const symbol = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
  const node = symbol.declarations?.[0] ?? source;
  if (symbol.flags & ts.SymbolFlags.Class) {
    lines.push(`class ${exp.name}`, ...members(symbol, node));
  } else if (symbol.flags & ts.SymbolFlags.Interface) {
    lines.push(`interface ${exp.name}`, ...members(symbol, node));
  } else if (symbol.flags & ts.SymbolFlags.Enum) {
    lines.push(`enum ${exp.name}`, ...symbol.exports.keys().toArray().sort().map((k) => `  ${k}`));
  } else if (symbol.flags & ts.SymbolFlags.TypeAlias) {
    // The declaration text, not the resolved type: an alias like `'a' | 'b'` must keep its members visible.
    const rhs = ts.isTypeAliasDeclaration(node) ? node.type.getText().replace(/\s+/g, ' ') : typeText(checker.getDeclaredTypeOfSymbol(symbol), node);
    const params = ts.isTypeAliasDeclaration(node) && node.typeParameters?.length ? `<${node.typeParameters.map((p) => p.getText()).join(', ')}>` : '';
    lines.push(`type ${exp.name}${params} = ${rhs}`);
  } else if (symbol.flags & ts.SymbolFlags.Function) {
    const sigs = checker.getTypeOfSymbolAtLocation(symbol, node).getCallSignatures().map((s) => checker.signatureToString(s, node, flags));
    lines.push(...sigs.map((s) => `function ${exp.name}${s}`));
  } else {
    lines.push(`const ${exp.name}: ${typeText(checker.getTypeOfSymbolAtLocation(symbol, node), node)}`);
  }
}

const actual = `${lines.join('\n')}\n`;

if (update) {
  mkdirSync(dirname(snapshotFile), { recursive: true });
  writeFileSync(snapshotFile, actual);
  console.log(`wrote ${snapshotFile} (${lines.length} lines)`);
  process.exit(0);
}

if (!existsSync(snapshotFile)) {
  console.error(`error: ${snapshotFile} not found, run \`npm run api:update\` and commit it.`);
  process.exit(2);
}

const expected = readFileSync(snapshotFile, 'utf8');
if (expected === actual) {
  console.log(`public API matches api/public-api.txt (${lines.length} lines)`);
  process.exit(0);
}

const exp = new Set(expected.split('\n'));
const act = new Set(actual.split('\n'));
const removed = [...exp].filter((l) => l && !act.has(l));
const added = [...act].filter((l) => l && !exp.has(l));
console.error('error: the public API changed. If that is intended, run `npm run api:update` and commit api/public-api.txt.');
removed.slice(0, 40).forEach((l) => console.error(`- ${l}`));
added.slice(0, 40).forEach((l) => console.error(`+ ${l}`));
if (removed.length > 40 || added.length > 40) console.error('(output truncated)');
process.exit(1);
