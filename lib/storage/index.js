var path = require('path');
var EventEmitter = require('events').EventEmitter;

module.exports = Storage;

function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  EventEmitter.call(this);

  options = options
    || { driver: 'fs', path: path.resolve(__dirname, '../../test/files') }
  ;

  this.driver = new (require('./' + options.driver || 'fs'))(options);
}

var p = Storage.prototype = new EventEmitter();

p.fetch = function(originalPath, stepsHash, cb) {
  var $this = this;
  this.driver.fetch(originalPath, stepsHash, function(err, img) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    cb(null, img);
  });
};

p.store = function(originalPath, stepsHash, image, cb) {
  var $this = this;
  this.driver.store(originalPath, stepsHash, image, function(err) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    cb();
  });
};
