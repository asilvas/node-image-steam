import { parentPort, workerData } from 'node:worker_threads';
import request from '../util/blind-request.ts';
import sleep from '../util/sleep.ts';

const { argv, baseUrl, workerIndex } = workerData;

let fileIndex = 1;
let gStats: { requests: any[]; errors: number } = { requests: [], errors: 0 };

const cachedUrls: string[] = [];

// worker main
(async () => {
  // prime optimized original
  await request(`${baseUrl}/w:${workerIndex}/:/rs=h:1`).catch(() => null);
  let url;
  for (let i = 0; i < 10; i++) {
    url = `${baseUrl}/w:${workerIndex}/:/rs=w:${500 + i * 100}/fm=f:${
      argv.format
    }`;
    cachedUrls.push(url);
    await request(url).catch(() => null);
  }

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
  const url = cachedUrls[fileIndex++ % cachedUrls.length];
  const res: any = await request(url).catch((err) => ({ err }));

  if (res.err) {
    gStats.errors++;
    await sleep(100);
  } else {
    gStats.requests.push(res);
  }
}
