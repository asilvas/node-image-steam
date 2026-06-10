/*
  Node >=26 treats extensionless files inside a `"type": "module"` package as ESM,
  which breaks `require('yargs/yargs')` in yargs v16/v17 (used by c8 and others) since
  the extensionless `yargs` file is CommonJS. Until upstream ships a fix, give that
  file a `.cjs` twin and point the `require` export condition at it. Idempotent;
  runs automatically via the `prepare` lifecycle script.
*/
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function findYargsDirs(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const pkgDir = path.join(dir, entry);
    if (!fs.statSync(pkgDir).isDirectory()) continue;
    if (entry.startsWith('@')) {
      findYargsDirs(pkgDir, found);
      continue;
    }
    if (entry === 'yargs') found.push(pkgDir);
    findYargsDirs(path.join(pkgDir, 'node_modules'), found);
  }
  return found;
}

function patch(dir: string): void {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.name !== 'yargs' || pkg.type !== 'module') return;
  const legacy = path.join(dir, 'yargs');
  if (!fs.existsSync(legacy) || !pkg.exports?.['./yargs']) return;
  const cjs = path.join(dir, 'yargs.cjs');
  if (!fs.existsSync(cjs)) fs.copyFileSync(legacy, cjs);
  pkg.exports['./yargs'] = { import: './yargs.mjs', require: './yargs.cjs' };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(
    `fix-yargs-node26: patched ${path.relative(root, dir)} (yargs@${
      pkg.version
    })`
  );
}

const dirs = [
  path.join(root, 'node_modules'),
  ...fs
    .readdirSync(path.join(root, 'packages'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(root, 'packages', d.name, 'node_modules')),
];

for (const dir of dirs) {
  findYargsDirs(dir).forEach(patch);
}
