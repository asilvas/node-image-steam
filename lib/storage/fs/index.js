const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const StorageBase = require('../storage-base');

module.exports = StorageFs;

function StorageFs(options) {
  StorageBase.apply(this, arguments);
}

const p = StorageFs.prototype = new StorageBase();

p.fetch = function(options, originalPath, stepsHash, cb) {
  const filename = path.resolve(options.path || './',
    stepsHash
    ? `${originalPath}-${stepsHash}`
    : originalPath
  );

  fs.readFile(filename + '.json', 'utf8', function(err, data) {
    let info = { path: originalPath, stepsHash: stepsHash };
    if (data) {
      try {
        info = _.merge(info, JSON.parse(data.toString()));
      } catch (err) {
        return cb(err);
      }
    }

    let error, fileStats, fileData;

    fs.stat(filename, (err, stats) => {
      if (err) {
        if (error) return; // cb already called
        error = err;
        return void cb(err);
      }

      fileStats = stats;
      info.lastModified = stats.mtime;
      if (fileStats && fileData) {
        cb(null, info, fileData);
      }
    });

    fs.readFile(filename, (err, data) => {
      if (err) {
        if (error) return; // cb already called
        error = err;
        return void cb(err);
      }

      fileData = data;
      if (fileStats && fileData) {
        cb(null, info, fileData);
      }
    });
  });
};


function checkDir(filename, cb) {
  const folder = path.dirname(filename);
  fs.stat(folder, (err, data) => {
    if(!err) return cb();
    if(err.code === 'ENOENT') {
      fs.mkdirp(folder, err => {
        if (err) {
          return void cb(err);
        }
        cb();
      });
    } else {
      return void cb(err);
    }
  });
}

p.touch = function(options, originalPath, stepsHash, image, cb) {
  const filename = path.resolve(options.path || './', `${originalPath}-${stepsHash}`);
  const now = new Date();

  // touch
  fs.utimes(filename, now, now, cb);
}

p.store = function(options, originalPath, stepsHash, image, cb) {
  const filename = path.resolve(options.path || './', `${originalPath}-${stepsHash}`);

  image.info.stepsHash = stepsHash;

  checkDir(filename, err => {
    if (err) {
      return void cb(err);
    }
    fs.writeFile(filename + '.json', new Buffer(JSON.stringify(image.info)), 'utf8', function(err) {
      // do nothing
    });
    fs.writeFile(filename, image.buffer, cb);
  });
};

p.deleteCache = function(options, originalPath, cb) {
  const cachePath = path.resolve(options.path || './');
  
  fs.remove(cachePath, cb);
};
