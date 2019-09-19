const Screen = require('./screen');

module.exports = class Bench {
  constructor(argv) {
    this.argv = argv;
    this.testReset();
    this.scores = {};

    this.screen = new Screen(this);
  }

  log(msg, type = 'log') {
    this.screen.log(msg, type);
  }

  testStart(name) {
    this.testName = name;
    this.concurrency = 0;
    this.rps = 0;
    this.eps = 0; // errors per second
    this.kbps = 0; // Kbit/s
    this.ttfb50th = 0;
    this.ttfb75th = 0;
    this.ttfb90th = 0;
    this.log(`${this.testName} starting...`);
    this.testReset();
    this.scores[this.testName] = this.testData.score;
  }

  testReset() {
    this.testData = {
      start: Date.now(),
      lastUpdate: Date.now(),
      lastOptimal: Date.now(),
      ttfbMean: 0,
      score: {
        perf: { ttfb50th: 0, ttfb75th: 0, ttfb90th: 0, kbps: 0 },
        min: { rps: 0, ttfb: 0, concurrency: 0, kbps: 0 },
        max: { rps: 0, ttfb: 0, concurrency: 0, kbps: 0 },
        optimal: { rps: 0, ttfb: 0, concurrency: 0, kbps: 0 }
      },
      isOver: false,
      requests: [],
      errors: 0,
      lastTickRequests: [],
      lastTickErrors: 0
    };
  }

  testEnd() {
    this.log(`${this.testName} complete`);

    this.testReset();
    this.testName = null;
  }

  onTestData({ workerIndex }, { requests, errors }) {
    this.testData.lastTickRequests = this.testData.lastTickRequests.concat(requests);
    this.testData.lastTickErrors += errors;
  }

  get testIsOver() {
    return this.testData.isOver;
  }

  updateScreen() {
    this.updateTestStats();

    this.screen.render();
  }

  updateTestStats() {
    if (this.testData.isOver) return;
  
    if (this.testData.lastTickErrors > 0) {
      this.testData.isOver = true;
    }

    // don't process fewer than 8 updates at a time
    if (!this.testData.isOver && this.testData.lastTickRequests.length < 8) return;

    this.testData.errors += this.testData.lastTickErrors;

    const ttfbSorted = this.testData.lastTickRequests.sort((a, b) => a.ttfb < b.ttfb ? -1 : 1);
    const ttfb50th = this.ttfb50th = ttfbSorted[Math.floor(ttfbSorted.length / 2)].ttfb;
    const ttfb75th = this.ttfb75th = ttfbSorted[Math.floor(ttfbSorted.length * 0.75)].ttfb;
    const ttfb90th = this.ttfb90th = ttfbSorted[Math.floor(ttfbSorted.length * 0.90)].ttfb;
    const elapsed = Date.now() - this.testData.lastUpdate;
    const rpsFactor = 1000 / elapsed;
    const rps = this.rps = Math.round(this.testData.lastTickRequests.length * rpsFactor);
    this.eps = Math.round(this.testData.lastTickErrors * rpsFactor);
    const totalKb = ttfbSorted.reduce((total, { size }) => {
      return total + ((size * 8) / 1000); // bits / kilo
    }, 0);
    const kbps = this.kbps = Math.round(totalKb * rpsFactor);
    const timeSinceStart = Date.now() - this.testData.start;
    const timeSinceLastOptimal = Date.now() - this.testData.lastOptimal;

    this.testData.requests = this.testData.requests.concat(this.testData.lastTickRequests);

    if (!this.testData.ttfbMean) {
      this.testData.score.perf.ttfb50th = ttfb50th;
      this.testData.score.perf.ttfb75th = ttfb75th;
      this.testData.score.perf.ttfb90th = ttfb90th;
      this.testData.score.perf.kbps = kbps;

      this.testData.ttfbMean = ttfb50th;
    }

    if (!this.testData.score.min.ttfb && ttfb50th >= (this.testData.score.perf.ttfb50th * this.argv.minLoad)) {
      this.testData.score.min.ttfb = ttfb50th;
      this.testData.score.min.rps = rps;
      this.testData.score.min.concurrency = this.concurrency;
      this.testData.score.min.kbps = kbps;
    }

    // optimal load is the point of highest throughput
    if (!this.testData.score.optimal.rps || rps > this.testData.score.optimal.rps) {
      this.testData.lastOptimal = Date.now();
      this.testData.score.optimal.ttfb = ttfb50th;
      this.testData.score.optimal.rps = rps;
      this.testData.score.optimal.concurrency = this.concurrency;
      this.testData.score.optimal.kbps = kbps;
      this.testData.score.max.ttfb = 0; // reset anytime new optimal level detected
    } else if (timeSinceLastOptimal > 20000) {
      // if we're not seeing optimal changes for quite a while, end test
      this.testData.isOver = true;
    }

    // max load is determined by 2x latency (or whatever `maxLoad` is set to) of optimal TTFB
    const maxLoadLatency = Math.max(20, Math.floor(this.testData.score.optimal.ttfb * this.argv.maxLoad));

    // fixed request option takes priority over default `maxLoad` behavior
    if (this.argv.requests && this.testData.requests.length >= this.argv.requests) {
      if (!this.testData.score.min.ttfb) { // if no minimum yet set, do it now
        this.testData.score.min.ttfb = ttfb50th;
        this.testData.score.min.rps = rps;
        this.testData.score.min.concurrency = this.concurrency;
        this.testData.score.min.kbps = kbps;
      }
  
      this.testData.isOver = true;
    }

    // take the first round that exceeds threshold, then end it
    if (!this.argv.requests && timeSinceStart > this.argv.minRunTime && !this.testData.score.max.ttfb && ttfb50th >= maxLoadLatency) {
      this.testData.score.max.ttfb = ttfb50th;
      this.testData.score.max.rps = rps;
      this.testData.score.max.concurrency = this.concurrency;
      this.testData.score.max.kbps = kbps;
      this.testData.isOver = true;
    }

    this.scores[this.testName] = this.testData.score;

    // reset tracker
    this.testData.lastUpdate = Date.now();
    this.testData.lastTickRequests = [];
    this.testData.lastTickErrors = 0;
  }
}
