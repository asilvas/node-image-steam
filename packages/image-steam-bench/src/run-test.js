const path = require('path');
const sleep = require('./util/sleep');
const files = require('./files');
const {
  Worker
} = require('worker_threads');

const testDir = path.resolve(__dirname, 'test');
let gReady;

module.exports = async (bench, testName) => {

  const workers = [];

  gReady = false;
  const benchKey = new Date().toLocaleString();

  bench.testStart(testName);

  workers.push(spawnWorker(bench, testName, { benchKey, workerIndex: workers.length }));
  bench.concurrency = workers.length;

  do {
    await sleep(500);
  } while (!gReady);

  bench.testReset();

  bench.log(`${testName} running...`);

  let screenUpdate = 0;

  do {
    for (let i = 0; i < bench.argv.workerSpawnTime; i++) {
      await sleep(1000);

      if ((screenUpdate++ % bench.argv.screenRefresh) === 0) {
        bench.updateScreen();  
      }
    }

    let workersToSpawn = Math.ceil(workers.length * bench.argv.workerSpawnRate) || 1;
    for (let i = 0; i < workersToSpawn; i++) {
      workers.push(spawnWorker(bench, testName, { benchKey, workerIndex: workers.length }));
    }

    bench.concurrency = workers.length;
  } while (!bench.testIsOver)

  bench.log(`${testName} wrapping up...`);

  // destroy workers
  workers.forEach(worker => worker.terminate());

  await sleep(2000);

  bench.testEnd();
}

function spawnWorker(bench, testName, { workerIndex, benchKey }) {
  const workerPath = path.resolve(testDir, `${testName}.js`);
  // a given worker is locked to the same filename
  const fileName = files.byIndex[workerIndex % 3];
  const baseUrl = `${bench.argv.url}/${fileName}/${benchKey}`;
  const worker = new Worker(workerPath, { workerData: { argv: bench.argv, baseUrl, fileName, workerIndex } });
  worker.on('message', data => {
    if (data.ready) gReady = true;
    if (data.requests) bench.onTestData({ testName, workerIndex }, data);
  });
  worker.on('error', err => {
    bench.log(err, 'error');
  });

  return worker;
}
