const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { writeFileSync, appendFileSync } = require('fs');
const tests = require('./test');

module.exports = class Screen {
  constructor(bench) {
    this.bench = bench;

    if (this.bench.argv.log !== 'false') writeFileSync(this.bench.argv.log, 'Started\n');

    this.screen = blessed.screen();

    process.on('uncaughtException', err => {
      this.log(err.stack || err.message || err);

      process.exit();
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log('unhandledRejection');

      process.exit();
    });

    this.screen.key(['escape', 'q', 'C-c'], (ch, key) => {
      this.destroy();

      // output scores
      this.printScoreDataAsMarkup();

      console.log('');
  
      return process.exit(0);
    });

    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    this.screenLog = this.grid.set(8, 8, 4, 4, contrib.log, {
      padding: 1,
      fg: 'white',
      selectedFg: 'green',
      label: 'Activity Log'
    });

    this.screenThroughput = this.grid.set(0, 0, 8, 8, contrib.line, {
      style: {
        text: 'white',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: false,
      wholeNumbersOnly: true,
      numYLabels: 8,
      showNthLabel: 5,
      legend: { width: 20 },
      label: 'Throughput (rps)'
    });

    // hacky labels due to limitations of line widget
    this.timeLabels = Array.from(Array(this.bench.argv.timeWindow)).map((v, i) => ` `);
    this.timeLabels[Math.floor(this.bench.argv.timeWindow / 2)] = 'time';

    this.throughputData = {
      style: { line: 'green' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };

    this.screenLatency = this.grid.set(4, 8, 4, 4, contrib.line, {
      style: {
        text: 'white',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: false,
      wholeNumbersOnly: true,
      numYLabels: 4,
      showNthLabel: 5,
      legend: { width: 20 },
      label: 'Latency (50th / 75th / 90th)'
    });

    this.latencyData50th = {
      style: { line: 'green' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };
    this.latencyData75th = {
      style: { line: 'yellow' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };
    this.latencyData90th = {
      style: { line: 'red' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };

    this.screenErrorsConcurrency = this.grid.set(0, 8, 4, 4, contrib.line, {
      style: {
        text: 'white',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: false,
      wholeNumbersOnly: true,
      numYLabels: 4,
      showNthLabel: 5,
      legend: { width: 15 },
      label: 'Concurrency / Errors'
    });

    this.errorsData = {
      title: 'Errors',
      style: { line: 'red' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };
    this.concurrencyData = {
      title: 'Concurrency',
      style: { line: 'yellow' },
      x: this.timeLabels,
      y: Array.from(Array(this.bench.argv.timeWindow)).map(() => 0)
    };

    this.screenScores = this.grid.set(8, 0, 4, 8, contrib.table, {
      keys: true,
      fb: 'white',
      label: 'Test Scores',
      columnSpacing: 1,
      columnWidth: [10, 10, 40, 40, 40]
    });
    this.scoreHeaders = [
      'Name',
      'Status',
      'Baseline 50th, 75th, 90th',
      'Min (Safe) Load',
      'Optimal (Peak) Load'/*,
      'Max (Break) Load'*/
    ];

  }

  log(msg) {
    const line = msg.toString();

    if (this.bench.argv.log !== 'false') appendFileSync(this.bench.argv.log, line + '\n');

    this.screenLog.log(line);
    this.screenLog.select(this.screenLog.logLines.length - 1); // unsure why this isn't showing selected
  }

  get scores() { return this.bench.scores; }
  get testData() { return this.bench.testData; }

  render() {
    this.throughputData.y.push(this.bench.rps);
    this.throughputData.y.shift();
    this.screenThroughput.setData([this.throughputData]);

    this.latencyData50th.y.push(this.bench.ttfb50th);
    this.latencyData50th.y.shift();
    this.latencyData75th.y.push(this.bench.ttfb75th);
    this.latencyData75th.y.shift();
    this.latencyData90th.y.push(this.bench.ttfb90th);
    this.latencyData90th.y.shift();
    this.screenLatency.setData([this.latencyData50th, this.latencyData75th, this.latencyData90th]);

    this.errorsData.y.push(this.bench.eps);
    this.errorsData.y.shift();
    this.concurrencyData.y.push(this.bench.concurrency);
    this.concurrencyData.y.shift();
    this.screenErrorsConcurrency.setData([this.errorsData, this.concurrencyData]);

    this.screenScores.setData({
      headers: this.scoreHeaders,
      data: this.getScoreData()
    });
    this.screenScores.rows.select(this.scoreIndex);

    this.screen.render();
  }

  getScoreData() {
    this.scoreIndex = 0;

    return tests.map((testName, idx) => {
      let scores = this.scores[testName];

      if (scores && scores.max.rps) this.scoreIndex = idx + 1;

      const state = scores && scores.max.rps ? 'complete' : this.bench.testName === testName ? 'working' : 'pending';
      
      const perf = scores && scores.perf.ttfb50th ? `${scores.perf.ttfb50th}ms, ${scores.perf.ttfb75th}ms, ${scores.perf.ttfb90th}ms, ${kbpsToString(scores.perf.kbps)}` : '';
      const minLoad = scores && scores.min.rps ? `${scores.min.rps}rps, ${scores.min.concurrency}cc, ${scores.min.ttfb}ms, ${kbpsToString(scores.min.kbps)}` : '';
      const optimalLoad = scores && scores.optimal.rps ? `${scores.optimal.rps}rps, ${scores.optimal.concurrency}cc, ${scores.optimal.ttfb}ms, ${kbpsToString(scores.optimal.kbps)}` : '';

      return [testName, state, perf, minLoad, optimalLoad];
    });
  }

  printScoreDataAsMarkup() {
    const markup = this.getScoreData().reduce((state, test) => {
      state.push(test.map(v => `| ${v} `).join('') + '|');
      return state;
    }, [
      this.scoreHeaders.map(h => `| ${h} `).join('') + '|',
      this.scoreHeaders.map(() => `| --- `).join('') + '|'
    ]);

    console.log('Test Scores:');
    markup.forEach(line => console.log(line));
  }

  destroy() {
    this.screen.destroy();
  }
}

function kbpsToString(kbps) {
  const mbps = kbps / 1000;
  const gbps = mbps / 1000;
  if (mbps < 1) return `${kbps.toFixed(1)}Kb/s`;
  else if (gbps < 1) return `${mbps.toFixed(1)}Mb/s`;
  else return `${gbps.toFixed(1)}Gb/s`;
}
