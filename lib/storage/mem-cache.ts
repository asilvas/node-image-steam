/*
  Opt-in in-memory LRU cache for processed artifacts. Serving a hot artifact
  from memory avoids storage round-trips (3 fs ops per hit for the fs driver)
  and the associated buffer allocations.

  Entries expire after `tts` seconds so staleness is bounded in multi-server
  deployments, and total buffer bytes are capped at `maxSize` with
  least-recently-used eviction.
*/

import Image from '../image.ts';

export default class MemCache {
  maxSize: number;
  ttsMs: number;
  #entries = new Map<string, { image: any; expires: number; bytes: number }>();
  #bytes = 0;

  constructor(options?: any) {
    options = options || {};
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.ttsMs = (options.tts || 30) * 1000; // 30s
  }

  get size(): number {
    return this.#bytes;
  }

  get count(): number {
    return this.#entries.size;
  }

  get(key: string): any {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (Date.now() >= entry.expires) {
      this.#entries.delete(key);
      this.#bytes -= entry.bytes;
      return undefined;
    }

    // refresh recency (Map preserves insertion order)
    this.#entries.delete(key);
    this.#entries.set(key, entry);

    // hand out a per-request copy (shared read-only buffer, copied info) --
    // callers mutate image.info during processing (e.g. processor aliases
    // info onto the output artifact) and must not corrupt the cached entry
    return new Image({ ...entry.image.info }, entry.image.buffer);
  }

  set(key: string, sourceImage: any): void {
    const bytes =
      (sourceImage && sourceImage.buffer && sourceImage.buffer.length) || 0;
    if (!bytes || bytes > this.maxSize) return;

    const existing = this.#entries.get(key);
    if (existing) {
      this.#entries.delete(key);
      this.#bytes -= existing.bytes;
    }

    // snapshot the info so later caller mutations don't alter the entry
    const image = new Image({ ...sourceImage.info }, sourceImage.buffer);

    this.#entries.set(key, { image, expires: Date.now() + this.ttsMs, bytes });
    this.#bytes += bytes;

    // evict least-recently-used until within budget
    while (this.#bytes > this.maxSize) {
      const oldestKey = this.#entries.keys().next().value!;
      const oldest = this.#entries.get(oldestKey)!;
      this.#entries.delete(oldestKey);
      this.#bytes -= oldest.bytes;
    }
  }

  clear(): void {
    this.#entries.clear();
    this.#bytes = 0;
  }
}
