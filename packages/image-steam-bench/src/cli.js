const yargs = require('yargs');
const run = require('./run');
const tests = require('./test');

const args = yargs
  .option('port', {
    alias: 'p',
    type: 'number',
    describe: 'Port for image-steam-bench to listen on (same port image-steam should be mapped back to)',
    default: 12124
  })
  .option('test', {
    alias: 't',
    type: 'array',
    choices: [...tests],
    describe: 'one or more tests to run',
    default: [...tests]
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    choices: ['webp', 'jpeg'],
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
  .option('minRunTime', {
    type: 'number',
    describe: 'Minimum time (in ms) that a test must run before determinating. If `requests` is specified that will take priority',
    default: 20000
  })
  .option('requests', {
    type: 'number',
    describe: 'A fixed number of requests before resolving test(s), versus the default behavior of ending on `maxLoad`'
  })
  .option('workerMin', {
    type: 'number',
    describe: 'Number of workers to start out with',
    default: 1
  })
  .option('workerMax', {
    type: 'number',
    describe: 'Maximum number of workers allowed',
    default: 999
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
  .option('timeWindow', {
    type: 'number',
    describe: 'Seconds represented on historical graphs',
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
