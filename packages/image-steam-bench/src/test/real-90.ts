import { parentPort, workerData } from 'node:worker_threads';
import request from '../util/blind-request.ts';
import sleep from '../util/sleep.ts';

const { argv, baseUrl, workerIndex } = workerData;

const REAL_OPTIMIZED_MOD = 46; // Every 46th = 8%
const REAL_ORIGIN_MOD = 49; // Every 49th = 2%

let fileIndex = 1;
let gStats: { requests: any[]; errors: number } = { requests: [], errors: 0 };

// worker main
(async () => {
  // prime optimized original & cache artifact
  await request(
    `${baseUrl}/w:${workerIndex}/:/rs=w:1000/fm=f:${argv.format}`
  ).catch(() => null);

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
  const url =
    fileIndex % REAL_ORIGIN_MOD === REAL_ORIGIN_MOD - 1
      ? // always (unique) origin hit
        `${baseUrl}/w:${workerIndex}/f:${fileIndex}/:/rs=w:1000/fm=f:${argv.format}`
      : fileIndex % REAL_OPTIMIZED_MOD === REAL_OPTIMIZED_MOD - 1
      ? // optimized url but will always generate new artifact
        `${baseUrl}/w:${workerIndex}/:/rs=w:${100 + fileIndex}/fm=f:${
          argv.format
        }`
      : // always cached
        `${baseUrl}/w:${workerIndex}/:/rs=w:1000/fm=f:${argv.format}`;

  const res: any = await request(url).catch((err) => ({ err }));

  fileIndex++;

  if (res.err) {
    gStats.errors++;
    await sleep(100);
  } else {
    gStats.requests.push(res);
  }
}
