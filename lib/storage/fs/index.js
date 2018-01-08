var path = require('path');
var fs = require('fs-extra');
var _ = require('lodash');
var StorageBase = require('../storage-base');

module.exports = StorageFs;

function StorageFs(options) {
  StorageBase.apply(this, arguments);
}

var p = StorageFs.prototype = new StorageBase();

p.fetch = function(options, originalPath, stepsHash, cb) {
  var filename = originalPath;
  if (stepsHash) {
    filename += '-' + stepsHash;
  }

  filename = path.resolve(options.path || './', filename);

  fs.readFile(filename + '.json', 'utf8', function(err, data) {
    var info = { path: originalPath, stepsHash: stepsHash };
    if (data) {
      try {
        info = _.merge(info, JSON.parse(data.toString()));
      catch (err) {
        return cb(err);
      }
    }

    fs.readFile(filename, function(err, data) {
      if (err) {
        return void cb(err);
      }
      cb(null, info, data);
    });
  });
};


function checkDir(filename, cb) {
  var folder = path.dirname(filename);
  fs.stat(folder, function(err, data) {
    if(!err) return cb();
    if(err.code === 'ENOENT') {
      fs.mkdirp(folder, function(err){
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

p.store = function(options, originalPath, stepsHash, image, cb) {
  var filename = originalPath;
  if (!stepsHash) {
    return void cb(new Error('Cannot store an image over the original'));
  }
  filename += ('-' + stepsHash);
  filename = path.resolve(options.path || './', filename);

  image.info.stepsHash = stepsHash;

  checkDir(filename, function(err){
    if (err) {
      return void cb(err);
    }
    fs.writeFile(filename + '.json', new Buffer(JSON.stringify(image.info)), 'utf8', function(err) {
      // do nothing
    });
    fs.writeFile(filename, image.buffer, cb);

  });
};
