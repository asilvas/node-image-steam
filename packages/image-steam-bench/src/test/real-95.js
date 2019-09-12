const {
  parentPort, workerData
} = require('worker_threads');
const request = require('../util/blind-request');

const { baseUrl, workerIndex } = workerData;

const REAL_OPTIMIZED_MOD = 48; // Every 48th = 4%
const REAL_ORIGIN_MOD = 99; // Every 99th = 1%

let fileIndex = 1;
let gStats = { requests: [], errors: 0 };

// worker main
(async () => {

  // prime optimized original & cache artifact
  await request(`${baseUrl}/w:${workerIndex}/:/rs=w:1`).catch(() => null);

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
  const url = (fileIndex % REAL_ORIGIN_MOD) === (REAL_ORIGIN_MOD-1)
    // always (unique) origin hit
    ? `${baseUrl}/w:${workerIndex}/f:${fileIndex}/:/rs=w:1` : (fileIndex % REAL_OPTIMIZED_MOD) === (REAL_OPTIMIZED_MOD-1)
    // optimized url but will always generate new artifact
    ? `${baseUrl}/w:${workerIndex}/:/rs=w:${1+fileIndex}`
    // always cached
    : `${baseUrl}/w:${workerIndex}/:/rs=w:1`

  const { ttfb, err } = await request(url).catch(err => ({
    err
  }));

  fileIndex++;

  if (err) {
    gStats.errors++;
  } else {
    gStats.requests.push({ ttfb });
  }
}
