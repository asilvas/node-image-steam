const blessed = require('blessed');
const contrib = require('blessed-contrib');
const tests = require('./test');

const screen = blessed.screen();

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const screenLog = grid.set(8, 8, 4, 4, contrib.log, {
  padding: 1,
  fg: 'white',
  selectedFg: 'green',
  label: 'Activity Log'
});

const screenThroughput = grid.set(0, 0, 8, 8, contrib.line, {
  style: {
    text: 'white',
    baseline: 'black'
  },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: false,
  wholeNumbersOnly: true,
  numYLabels: 8,
  showNthLabel: 10,
  legend: { width: 20 },
  label: 'Throughput (rps)'
});

// hacky labels due to limitations of line widget
const timeLabels = Array.from(Array(60)).map((v, i) => ` `);
timeLabels[30] = 'time';

const throughputData = {
  style: { line: 'green' },
  x: timeLabels,
  y: Array.from(Array(60)).map(() => 0)
};

const screenLatency = grid.set(4, 8, 4, 4, contrib.line, {
  style: {
    text: 'white',
    baseline: 'black'
  },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: false,
  wholeNumbersOnly: true,
  numYLabels: 5,
  showNthLabel: 10,
  maxY: 400, // origin hits can easily make this axis useless, so let's cap it
  legend: { width: 20 },
  label: 'Latency (ms)'
});

const latencyData = {
  style: { line: 'yellow' },
  x: timeLabels,
  y: Array.from(Array(60)).map(() => 0)
};

const screenErrorsConcurrency = grid.set(0, 8, 4, 4, contrib.line, {
  style: {
    text: 'white',
    baseline: 'black'
  },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: false,
  wholeNumbersOnly: true,
  numYLabels: 4,
  showNthLabel: 10,
  legend: { width: 15 },
  label: 'Concurrency / Errors'
});

const errorsData = {
  title: 'Errors',
  style: { line: 'red' },
  x: timeLabels,
  y: Array.from(Array(60)).map(() => 0)
};
const concurrencyData = {
  title: 'Concurrency',
  style: { line: 'yellow' },
  x: timeLabels,
  y: Array.from(Array(60)).map(() => 0)
};

const screenScores = grid.set(8, 0, 4, 8, contrib.table, {
  keys: true,
  fb: 'white',
  label: 'Test Scores',
  columnSpacing: 1,
  columnWidth: [10, 10, 30, 30, 30, 30]
});
const scoreHeaders = [
  'Name',
  'Status',
  'TTFB @ 50th / 75th / 90th',
  'Min Load',
  'Optimal Load',
  'Max Load'
];

module.exports = class Bench {
  constructor(argv) {
    this.argv = argv;
    this.concurrency = 0;
    this.testReset();
    this.scores = {};
  }

  log(msg, type = 'log') {
    screenLog.log(msg.toString());
    screenLog.select(screenLog.logLines.length - 1); // unsure why this isn't showing selected
    this.updateScreen();
  }

  testStart(name) {
    this.testName = name;
    this.concurrency = 0;
    this.rps = 0;
    this.eps = 0; // errors per second
    this.latency = 0;
    this.log(`${this.testName} starting...`);
    this.testReset();
  }

  testReset() {
    this.testData = {
      lastUpdate: Date.now(),
      ttfbMean: 0,
      ttfbSlow: 0,
      percent: 0,
      score: {
        perf: { ttfb50th: 0, ttfb75th: 0, ttfb90th: 0 },
        min: { rps: 0, ttfb: 0 },
        max: { rps: 0, ttfb: 0 },
        optimal: { rps: 0, ttfb: 0 }
      },
      isOver: false,
      requests: [],
      errors: 0,
      lastTickRequests: [],
      lastTickErrors: 0
    };
  }

  testEnd() {
    const scores = this.testData.score;
    this.scores[this.testName] = scores;
    this.log(`${this.testName} test complete`);

    this.testReset();
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

    throughputData.y.push(this.rps);
    if (throughputData.y.length > 60) {
      throughputData.y.shift();
    }
    screenThroughput.setData([throughputData]);

    latencyData.y.push(this.latency);
    if (latencyData.y.length > 60) {
      latencyData.y.shift();
    }
    screenLatency.setData([latencyData]);

    errorsData.y.push(this.eps);
    if (errorsData.y.length > 60) {
      errorsData.y.shift();
    }
    concurrencyData.y.push(this.concurrency);
    if (concurrencyData.y.length > 60) {
      concurrencyData.y.shift();
    }
    screenErrorsConcurrency.setData([errorsData, concurrencyData]);

    let scoreIndex = 0;
    screenScores.setData({
      headers: scoreHeaders,
      data: tests.map((testName, idx) => {
        const scores = this.scores[testName];

        if (scores) scoreIndex = idx + 1;

        const state = scores ? 'complete' : this.testName === testName ? `${this.testData.percent}%` : 'pending';

        const perf = scores ? `${scores.perf.ttfb50th}ms / ${scores.perf.ttfb75th}ms / ${scores.perf.ttfb90th}ms` : '';
        const minLoad = scores ? `${scores.min.rps}rps @ ${scores.min.concurrency}cc, ${scores.min.ttfb}ms` : '';
        const optimalLoad = scores ? `${scores.optimal.rps}rps @ ${scores.optimal.concurrency}cc, ${scores.optimal.ttfb}ms` : '';
        const maxLoad = scores ? `${scores.max.rps}rps @ ${scores.max.concurrency}cc, ${scores.max.ttfb}ms` : '';

        return [testName, state, perf, minLoad, optimalLoad, maxLoad];
      })
    });
    screenScores.rows.select(scoreIndex);

    screen.render();
  }

  updateTestStats() {
    if (this.testData.isOver) return;
  
    if (this.testData.lastTickErrors > 0) {
      this.testData.isOver = true;
    }

    // don't process fewer than 10 updates at a time
    if (!this.testData.isOver && this.testData.lastTickRequests.length < 10) return;

    this.testData.errors += this.testData.lastTickErrors;

    const ttfbSorted = this.testData.lastTickRequests.sort((a, b) => a.ttfb < b.ttfb ? -1 : 1);
    const ttfb50th = this.latency = ttfbSorted[Math.floor(ttfbSorted.length / 2)].ttfb;
    const elapsed = Date.now() - this.testData.lastUpdate;
    const rpsFactor = 1000 / elapsed;
    const rps = this.rps = this.testData.lastTickRequests.length * rpsFactor;
    this.eps = Math.round(this.testData.lastTickErrors * rpsFactor);

    this.testData.requests = this.testData.requests.concat(this.testData.lastTickRequests);

    if (!this.testData.ttfbMean) {
      // calc ttfb mean after the minimum number of requests are recorded
      const ttfbSorted = this.testData.requests.sort((a, b) => a.ttfb < b.ttfb ? -1 : 1);

      this.testData.score.perf.ttfb50th = ttfbSorted[Math.floor(ttfbSorted.length / 2)].ttfb;
      this.testData.score.perf.ttfb75th = ttfbSorted[Math.floor(ttfbSorted.length * 0.75)].ttfb;
      this.testData.score.perf.ttfb90th = ttfbSorted[Math.floor(ttfbSorted.length * 0.90)].ttfb;

      this.testData.ttfbMean = this.testData.score.perf.ttfb50th;
      this.testData.ttfbSlow = Math.max(this.testData.score.perf.ttfb90th * this.argv.maxLoad, 20);
    } else if (this.testData.ttfbSlow && ttfb50th >= this.testData.ttfbSlow) {
      // if too slow, signal test is over
      this.testData.isOver = true;
    }

    this.testData.percent = Math.min(100, Math.round(((ttfb50th - this.testData.score.perf.ttfb50th) / this.testData.ttfbSlow) * 100));

    if (!this.testData.score.max.ttfb) {
      if (!this.testData.score.min.ttfb && ttfb50th >= (this.testData.score.perf.ttfb50th * this.argv.minLoad)) {
        this.testData.score.min.ttfb = ttfb50th;
        this.testData.score.min.rps = Math.round(rps);
        this.testData.score.min.concurrency = this.concurrency;
      }

      // optimal load is the point of highest throughput
      if (!this.testData.score.optimal.rps || rps > this.testData.score.optimal.rps) {
        this.testData.score.optimal.ttfb = ttfb50th;
        this.testData.score.optimal.rps = Math.round(rps);
        this.testData.score.optimal.concurrency = this.concurrency;
      }

      // when things begin to break, that is max load
      if (!this.testData.score.max.ttfb && this.testIsOver) {
        this.testData.score.max.ttfb = ttfb50th;
        this.testData.score.max.rps = Math.round(this.testData.lastTickRequests.length * rpsFactor);
        this.testData.score.max.concurrency = this.concurrency;
      }
    }

    // temporary status
    //console.log(`last tick: concurrency:${this.concurrency}, 50th TTFB:${ttfb50th}, RPS:${rps}, errors:${this.testData.lastTickErrors}`);

    // TODO: good display of status

    // reset tracker
    this.testData.lastUpdate = Date.now();
    this.testData.lastTickRequests = [];
    this.testData.lastTickErrors = 0;
  }
}
