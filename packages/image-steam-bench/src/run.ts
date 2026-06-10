import Bench from './bench.ts';
import server from './server.ts';
import verifyISteam from './verify-isteam.ts';
import runTest from './run-test.ts';

export default {
  command: 'run <url>',
  desc: 'Begin benchmark',
  handler: async (argv: any) => {
    try {
      const bench = new Bench(argv);

      const closeServer = await server(bench);

      await verifyISteam(bench);

      for (let i = 0; i < argv.test.length; i++) {
        await runTest(bench, argv.test[i]);
      }

      bench.log('Tests complete.');

      // also persist final scores to the log for non-interactive runs
      bench.screen.getScoreMarkup().forEach((line: string) => bench.log(line));

      await closeServer();

      bench.log('Press ESC or Q to quit.');
      bench.updateScreen();
    } catch (ex: any) {
      console.error('Something went wrong!', ex.stack || ex.message || ex);
      console.log('Press ESC or Q to quit.');
    }
  },
};
