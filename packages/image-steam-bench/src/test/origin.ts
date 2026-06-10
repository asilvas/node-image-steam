import { parentPort, workerData } from 'node:worker_threads';
import request from '../util/blind-request.ts';
import sleep from '../util/sleep.ts';

const { argv, baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats: { requests: any[]; errors: number } = { requests: [], errors: 0 };

// worker main
(async () => {
  parentPort!.postMessage({ ready: true });

  setInterval(sendStats, 100);

  while (true) {
    await nextRequest();
  }
})();

function sendStats() {
  parentPort!.postMessage(gStats);
  gStats = { requests: [], errors: 0 };
}

async function nextRequest() {
  // unique index to avoid collisions with previous tests, workers, and files
  // every hit needs to be an origin hit
  const url = `${baseUrl}/w:${workerIndex}/f:${fileIndex++}/:/rs=w:1000/fm=f:${
    argv.format
  }`;
  const res: any = await request(url).catch((err) => ({ err }));

  if (res.err) {
    gStats.errors++;
    await sleep(100);
  } else {
    gStats.requests.push(res);
  }
}
