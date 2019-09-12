const {
  parentPort, workerData
} = require('worker_threads');
const request = require('../util/blind-request');

const { baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats = { requests: [], errors: 0 };

// worker main
(async () => {
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
  const url = `${baseUrl}/w:${workerIndex}/f:${fileIndex++}/:/rs=h:1`;
  const { ttfb, err } = await request(url).catch(err => ({
    err
  }));

  if (err) {
    gStats.errors++;
  } else {
    gStats.requests.push({ ttfb });
  }
}
