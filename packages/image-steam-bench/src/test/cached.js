const {
  parentPort, workerData
} = require('worker_threads');
const request = require('../util/blind-request');

const { argv, baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats = { requests: [], errors: 0 };

const cachedUrls = [];

// worker main
(async () => {

  // prime optimized original
  await request(`${baseUrl}/w:${workerIndex}/:/rs=h:1`).catch(() => null);
  let url;
  for (let i = 0; i < 10; i++) {
    url = `${baseUrl}/w:${workerIndex}/:/rs=w:${500+(i * 100)}/fm=f:${argv.format}`;
    cachedUrls.push(url);
    await request(url).catch(() => null);
  }

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
  const url = cachedUrls[fileIndex++ % cachedUrls.length];
  const res = await request(url).catch(err => ({
    err
  }));

  if (res.err) {
    gStats.errors++;
  } else {
    gStats.requests.push(res);
  }
}
