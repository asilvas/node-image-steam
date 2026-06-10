/*
  Benchmarks all available xxHash32 providers against each other.

  bun ./scripts/bench-hash.ts   -> Bun.hash.xxHash32 vs xxhash-wasm
  node ./scripts/bench-hash.ts  -> xxhash-wasm only
*/
import { randomBytes } from 'node:crypto';
import xxhashWasm from 'xxhash-wasm';

declare const Bun: any;

const SEED = 0xabcd1133;
const DURATION_MS = 1000;

type Provider = { name: string; fn: (buf: Buffer) => number };

const providers: Provider[] = [];

if (typeof Bun !== 'undefined' && Bun.hash?.xxHash32) {
  providers.push({
    name: 'Bun.hash.xxHash32',
    fn: (buf) => Number(Bun.hash.xxHash32(buf, SEED)),
  });
}

const { h32Raw } = await xxhashWasm();
providers.push({
  name: 'xxhash-wasm',
  fn: (buf) => h32Raw(buf, SEED) >>> 0,
});

if (providers.length < 2) {
  console.log(
    `Only ${providers.length} provider(s) available (${providers
      .map((p) => p.name)
      .join(', ')}) — nothing to compare.`
  );
}

const sizes = [
  { label: '16 B (steps)', bytes: 16 },
  { label: '1 KB', bytes: 1024 },
  { label: '64 KB (thumb)', bytes: 64 * 1024 },
  { label: '1 MB (image)', bytes: 1024 * 1024 },
  { label: '8 MB (original)', bytes: 8 * 1024 * 1024 },
];

function bench(fn: (buf: Buffer) => number, buf: Buffer) {
  // warmup
  for (let i = 0; i < 1000; i++) fn(buf);

  let ops = 0;
  const start = performance.now();
  let elapsed = 0;
  while (elapsed < DURATION_MS) {
    for (let i = 0; i < 100; i++) fn(buf);
    ops += 100;
    elapsed = performance.now() - start;
  }
  return {
    opsPerSec: ops / (elapsed / 1000),
    mbPerSec: (ops * buf.length) / (elapsed / 1000) / 1024 / 1024,
  };
}

const runtime =
  typeof Bun !== 'undefined' ? `Bun ${Bun.version}` : `Node ${process.version}`;
console.log(`Runtime: ${runtime}`);
console.log(`Providers: ${providers.map((p) => p.name).join(', ')}\n`);

for (const { label, bytes } of sizes) {
  const buf = randomBytes(bytes);

  // sanity: all providers must agree
  const expected = providers[0].fn(buf);
  for (const p of providers) {
    const actual = p.fn(buf);
    if (actual !== expected) {
      throw new Error(
        `Hash mismatch on ${label}: ${providers[0].name}=${expected} vs ${p.name}=${actual}`
      );
    }
  }

  console.log(`${label}:`);
  const results = providers.map((p) => ({ name: p.name, ...bench(p.fn, buf) }));
  const best = Math.max(...results.map((r) => r.opsPerSec));
  for (const r of results) {
    const rel =
      r.opsPerSec === best
        ? 'fastest'
        : `${((r.opsPerSec / best) * 100).toFixed(1)}% of fastest`;
    console.log(
      `  ${r.name.padEnd(22)} ${Math.round(r.opsPerSec)
        .toLocaleString()
        .padStart(12)} ops/s  ${Math.round(r.mbPerSec)
        .toLocaleString()
        .padStart(9)} MB/s  (${rel})`
    );
  }
  console.log();
}
