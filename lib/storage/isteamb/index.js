const StorageBase = require('../storage-base');
const path = require('path');
const fs = require('fs');

const fileNames = ['12mp.jpeg', '18mp.jpeg', '24mp.jpeg'];

const fileData = fileNames.reduce((state, fn) => {
  state[fn] = fs.readFileSync(path.resolve(__dirname, fn));
  return state;
}, {});

module.exports = class StorageImageSteamBench extends StorageBase
{
  constructor(opts) {
    super(opts);
  }

  fetch(opts, originalPath, stepsHash, cb) {
    const info = { path: originalPath, stepsHash: stepsHash };

    const [filename] = originalPath.split('/');
    const file = fileData[filename];
    if (!file) {
      return void cb(new Error('File not found'));
    }

    cb(null, info, file);
  }
}
