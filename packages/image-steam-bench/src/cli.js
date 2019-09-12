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
    describe: 'Increase in mean response times before considered minimum safe load',
    default: 1.25
  })
  .option('maxLoad', {
    type: 'number',
    describe: 'Increase in mean response times before considered maximum load',
    default: 1.75
  })
  .command(run)
  .demandCommand()
  .help()
  .argv
;
