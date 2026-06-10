import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import StorageBase from '../storage-base.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const fileNames = ['12mp.jpeg', '18mp.jpeg', '24mp.jpeg'];

// lazy-loaded on first fetch to avoid holding ~20MB unless the driver is used
let fileData: Record<string, Buffer> | null = null;

function getFileData(): Record<string, Buffer> {
  if (!fileData) {
    fileData = fileNames.reduce((state: Record<string, Buffer>, fn) => {
      state[fn] = fs.readFileSync(path.resolve(dirname, fn));
      return state;
    }, {});
  }
  return fileData;
}

export default class StorageImageSteamBench extends StorageBase {
  fetch(opts: any, originalPath: string, stepsHash: string, cb: any): void {
    const info = { path: originalPath, stepsHash: stepsHash };

    const [filename] = originalPath.split('/');
    const file = getFileData()[filename];
    if (!file) {
      return void cb(new Error('File not found'));
    }

    cb(null, info, file);
  }
}
