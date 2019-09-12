const Bench = require('./bench');
const server = require('./server');
const verifyISteam = require('./verify-isteam');
const runTest = require('./run-test');
const tests = require('./test');

module.exports = {
  command: 'run <url>',
  desc: 'Begin benchmark',
  handler: async argv => {
    const bench = new Bench(argv);

    const closeServer = await server(bench);

    await verifyISteam(bench);
    
    for (var i = 0; i < tests.length; i++) {
      await runTest(bench, tests[i]);
    }

    bench.log('Tests complete.');

    await closeServer();

    bench.log('Press ESC or Q to quit.');

    bench.updateScreen();
  }
}
