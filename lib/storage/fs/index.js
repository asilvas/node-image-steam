var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var StorageBase = require('../storage-base');
var Image = require('../../image');

module.exports = StorageFs;

function StorageFs(options) {
  StorageBase.apply(this, arguments);
}

var p = StorageFs.prototype = new StorageBase();

p.fetch = function(originalPath, stepsHash, cb) {
  var filename = originalPath;
  if (stepsHash) {
    filename += '-' + stepsHash;
  }

  filename = path.resolve(this.options.path || './', filename);

  fs.readFile(filename + '.json', 'utf8', function(err, data) {
    var info = { path: originalPath, stepsHash: stepsHash };
    if (data) {
      info = _.merge(info, JSON.parse(data.toString()));
    }

    fs.readFile(filename, function(err, data) {
      if (err) {
        return void cb(err);
      }

      cb(null, new Image(info, data));
    });
  });
};

p.store = function(originalPath, stepsHash, image, cb) {
  var filename = originalPath;
  if (!stepsHash) {
    return void cb(new Error('Cannot store an image over the original'));
  }
  filename += ('-' + stepsHash);
  filename = path.resolve(this.options.path || './', filename);

  image.info.stepsHash = stepsHash;

  fs.writeFile(filename + '.json', new Buffer(JSON.stringify(image.info)), 'utf8', function(err) {
    // do nothing
  });
  fs.writeFile(filename, image.buffer, cb);
};
