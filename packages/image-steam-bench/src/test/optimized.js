const {
  parentPort, workerData
} = require('worker_threads');
const request = require('../util/blind-request');

const { argv, baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats = { requests: [], errors: 0 };

// worker main
(async () => {

  // prime optimized original
  await request(`${baseUrl}/w:${workerIndex}/:/rs=h:1`).catch(() => null);

  parentPort.postMessage({ ready: true });

  const statsTimer = setInterval(sendStats, 100);

  do {
    await nextRequest();
  } while (!gStats.errors);

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
  const url = `${baseUrl}/w:${workerIndex}/:/rs=w:${100+fileIndex++}/fm=f:${argv.format}`;
  const res = await request(url).catch(err => ({
    err
  }));

  if (res.err) {
    gStats.errors++;
  } else {
    gStats.requests.push(res);
  }
}
