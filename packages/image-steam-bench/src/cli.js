const yargs = require('yargs');
const run = require('./run');

const args = yargs
  .option('port', {
    alias: 'p',
    type: 'number',
    describe: 'Port for image-steam-bench to listen on (same port image-steam should be mapped back to)',
    default: 12124
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    options: ['webp', 'jpeg'],
    describe: 'Image format requested in every test',
    default: 'webp'
  })
  .option('minLoad', {
    type: 'number',
    describe: 'Increase in 50th response times before considered minimum safe load',
    default: 1.25
  })
  .option('maxLoad', {
    type: 'number',
    describe: 'Max load is determined by optimal TTFB multiplied by this value',
    default: 2.0
  })
  .option('workerSpawnTime', {
    type: 'number',
    describe: 'Seconds before new workers are spawned',
    default: 3
  })
  .option('workerSpawnRate', {
    type: 'number',
    describe: 'The rate at which workers are spawned (0.2 being +20% per spawn)',
    default: 0.2
  })
  .option('screenRefresh', {
    type: 'number',
    describe: 'Seconds between updates',
    default: 1
  })
  .option('maxLatency', {
    type: 'number',
    describe: 'Max latency time (ms) displayed',
    default: 300
  })
  .option('timeWindow', {
    type: 'number',
    describe: 'Seconds represented on histograms',
    default: 40
  })
  .option('log', {
    type: 'string',
    describe: 'Filename of activity log, or false to disable',
    default: 'isteamb.log'
  })
  .command(run)
  .demandCommand()
  .help()
  .argv
;
