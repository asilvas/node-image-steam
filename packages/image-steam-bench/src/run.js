const Bench = require('./bench');
const server = require('./server');
const verifyISteam = require('./verify-isteam');
const runTest = require('./run-test');
const testsAvailable = require('./test');

module.exports = {
  command: 'run <url>',
  desc: 'Begin benchmark',
  handler: async argv => {
    try {

      const bench = new Bench(argv);

      const closeServer = await server(bench);

      await verifyISteam(bench);

      for (var i = 0; i < argv.test.length; i++) {
        await runTest(bench, argv.test[i]);
      }

      bench.log('Tests complete.');

      await closeServer();

      bench.log('Press ESC or Q to quit.');
      bench.updateScreen();
    } catch (ex) {
      console.error('Something went wrong!', ex.stack || ex.message || ex);
      console.log('Press ESC or Q to quit.');
    }
  }
}
