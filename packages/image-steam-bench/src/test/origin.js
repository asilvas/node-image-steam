const {
  parentPort, workerData
} = require('worker_threads');
const request = require('../util/blind-request');
const sleep = require('../util/sleep');

const { argv, baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats = { requests: [], errors: 0 };

// worker main
(async () => {
  parentPort.postMessage({ ready: true });

  const statsTimer = setInterval(sendStats, 100);

  while (true) {
    await nextRequest();
  }

  clearInterval(statsTimer);
  sendStats(); // final push

})();

function sendStats() {
  parentPort.postMessage(gStats);
  gStats = { requests: [], errors: 0 };
}

async function nextRequest() {
  // unique index to avoid collisions with previous tests, workers, and files
  // every hit needs to be an origin hit
  const url = `${baseUrl}/w:${workerIndex}/f:${fileIndex++}/:/rs=w:1000/fm=f:${argv.format}`;
  const res = await request(url).catch(err => ({
    err
  }));

  if (res.err) {
    gStats.errors++;
    await sleep(100);
  } else {
    gStats.requests.push(res);
  }
}
