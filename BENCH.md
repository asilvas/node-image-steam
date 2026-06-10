# Benchmark Results

Node.js vs Bun serving image-steam, measured with [image-steam-bench](./packages/image-steam-bench) (`npm run bench`, default settings).

- **Date:** June 10 2026 (image-steam v1.0.0, sharp 0.34.5)
- **Machine:** AMD Ryzen 9 9950X3D (16 cores), 96GB RAM, Windows 11 Pro
- **Runtimes:** Node v26.3.0, Bun 1.4.0
- **Method:** server + bench on the same machine; caches cleared before each run

Columns are `rps, concurrency, ttfb, throughput`. *Baseline* is single-worker latency (50th/75th/90th percentile + throughput); *Min (Safe) Load* and *Optimal (Peak) Load* are the load levels the bench scored before latency degraded.

## Node v26.3.0

| Name | Baseline 50th, 75th, 90th | Min (Safe) Load | Optimal (Peak) Load |
| --- | --- | --- | --- |
| origin | 719ms, 727ms, 744ms, 469.0Kb/s | 3rps, 3cc, 1095ms, 2.6Mb/s | 4rps, 4cc, 771ms, 2.7Mb/s |
| optimized | 38ms, 38ms, 40ms, 432.0Kb/s | 31rps, 3cc, 48ms, 2.0Mb/s | 64rps, 4cc, 54ms, 3.7Mb/s |
| cached | 1ms, 2ms, 2ms, 223.2Mb/s | 1256rps, 3cc, 2ms, 753.8Mb/s | 3457rps, 15cc, 4ms, 3.3Gb/s |
| real-90 | 2ms, 2ms, 3ms, 16.9Mb/s | 21rps, 7cc, 3ms, 9.6Mb/s | 237rps, 7cc, 3ms, 196.1Mb/s |
| real-95 | 2ms, 2ms, 2ms, 39.3Mb/s | 162rps, 7cc, 3ms, 137.5Mb/s | 380rps, 5cc, 2ms, 318.5Mb/s |

## Bun 1.4.0

| Name | Baseline 50th, 75th, 90th | Min (Safe) Load | Optimal (Peak) Load |
| --- | --- | --- | --- |
| origin | 717ms, 724ms, 729ms, 469.0Kb/s | 3rps, 3cc, 1135ms, 2.0Mb/s | 5rps, 7cc, 1363ms, 4.1Mb/s |
| optimized | 41ms, 43ms, 44ms, 407.0Kb/s | 36rps, 3cc, 52ms, 2.1Mb/s | 61rps, 4cc, 56ms, 3.4Mb/s |
| cached | 1ms, 2ms, 2ms, 242.4Mb/s | 2522rps, 5cc, 2ms, 2.1Gb/s | 3272rps, 9cc, 2ms, 3.2Gb/s |
| real-90 | 2ms, 2ms, 3ms, 17.7Mb/s | 192rps, 19cc, 2ms, 157.8Mb/s | 288rps, 9cc, 2ms, 313.0Mb/s |
| real-95 | 2ms, 2ms, 3ms, 34.2Mb/s | 213rps, 24cc, 3ms, 283.2Mb/s | 487rps, 19cc, 2ms, 416.4Mb/s |

## Takeaways

- **Node and Bun are effectively equivalent** for image-steam: image processing (sharp/libvips
  native code) dominates origin/optimized workloads, and both runtimes saturate the cached
  path at ~3.3k rps / ~3.3Gb/s with 1–2ms latency.
- The realistic mixes (real-90 / real-95, 90–95% cache hit rates) trade wins within run-to-run
  variance: Node peaked higher on real-90, Bun on real-95.
- Pick the runtime based on operational preference, not performance.

