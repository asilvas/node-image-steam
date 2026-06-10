export type HashFn = (buffer: Buffer, seed: number) => number;

declare const Bun: any;

async function resolveHasher(): Promise<HashFn> {
  // fastest path: Bun ships xxHash32 natively
  if (typeof Bun !== 'undefined' && Bun.hash?.xxHash32) {
    return (buffer, seed) => Number(Bun.hash.xxHash32(buffer, seed));
  }

  const { default: xxhashWasm } = await import('xxhash-wasm');
  const { h32Raw } = await xxhashWasm();
  return (buffer, seed) => h32Raw(buffer, seed) >>> 0;
}

// Both implementations return identical unsigned 32-bit xxHash32 values,
// so cache keys remain stable across runtimes and platforms.
export const hash: HashFn = await resolveHasher();
