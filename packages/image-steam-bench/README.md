# isteamb

Benchmark for Image Steam to help determine ideal hardware configurations and load levels.

![Dashboard](https://raw.githubusercontent.com/asilvas/node-image-steam/master/packages/image-steam-bench/docs/dashboard.jpg)


## Getting Started

* Add `isteamb` HTTP mapping to your Image-Steam configuration, allowing this benchmark to act as origin.
* Install via `npm i -g image-steam-bench`
* Run benchmark via `isteamb run http://localhost:8080/isteamb --port 12124`

### CLI Options

* `port` (default: `12124`) - Port for image-steam-bench to listen on
  (same port image-steam should be mapped back to).
* `format` (default: `webp`) - Image format requested in every test.
* `minLoad` (default: `1.25`) - Increase in mean response times before considered minimum safe load.
* `maxLoad` (default: `1.75`) - Increase in mean response times before considered maximum load.


## Tests

Gradual increase in concurrency load until errors or timeouts begin to occur, starting with a concurrency of 1 which is a measure of performance instead of load.

* Original - Worst case performance where nothing is cached.
* Optimized - Optimized originals available, but image artifacts must still be created.
* Cached - Best case scenario, no image operations, pure cache throughput.
* Real 90/8/2 - Emulation of more realworld environment where 90% of hits are cached, and 8% use optimized originals to create final image artifact, and 2% hit original and create both optimized original and image artifact.
* Real 95/4/1 - Emulation of more realworld environment where 95% of hits are cached, and 4% use optimized originals to create final image artifact, and 1% hit original and create both optimized original and image artifact.

### Final Scores

Calculated for each of the 5 tests.

* Performance (50th/75th/90th TTFB ms) - Single concurrency score to demonstrate raw performance.
* Minimum Load (req/sec @ concurrency, 50th ms) - The level of load before per-request
  response times begin to creep up.
* Optimal Load (req/sec @ concurrency, 50th ms) - The level of load that is considered ideal maximum
  before throughput begins to drop.
* Maximum Load (req/sec @ concurrency, 50th ms) - The level of load before things start breaking or
  becoming very slow.



## Dashboard

A number of real-time data points are available from the dashboard.

* Throughput (per/sec) - Histogram
* Errors (per/sec) / Concurrency - Histogram
* Latency (ms) - Histogram
* Test Progress (%) - Progress of all tests
* Scores - See `Final Scores`.
* Activity Log



## Files

Served from memory to emulate high throughput origin.

* `http://localhost:12124/isteamb/12mp.jpeg/*` - 12 magapixel (4256x2832) asset
* `http://localhost:12124/isteamb/18mp.jpeg/*` - 18 magapixel (5184x3456) asset
* `http://localhost:12124/isteamb/24mp.jpeg/*` - 24 magapixel (6016x4016) asset


### Credit

* `12mp.jpeg` - Photo by NASA on Unsplash
* `18mp.jpeg` - Photo by Justin Clark on Unsplash
* `24mp.jpeg` - Photo by Casey Horner on Unsplash
