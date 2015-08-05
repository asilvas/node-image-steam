var path = require('path');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

module.exports = Storage;

function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  EventEmitter.call(this);

  this.options = options
    || { driver: 'fs', path: path.resolve(__dirname, '../../test/files') }
  ;

  if (this.options.driverPath) {
    this.driver = new (require(this.options.driverPath))(this.options);
  } else {
    this.driver = new (require('./' + this.options.driver || 'fs'))(this.options);
  }
}

var p = Storage.prototype = new EventEmitter();

p.fetch = function(req, originalPath, stepsHash, cb) {
  var $this = this;
  var opts = this.getOptionsFromRequest(req);
  this.driver.fetch(opts, originalPath, stepsHash, function(err, img) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    cb(null, img);
  });
};

p.store = function(req, originalPath, stepsHash, image, cb) {
  var $this = this;
  var opts = this.getOptionsFromRequest(req);
  this.driver.store(opts, originalPath, stepsHash, image, function(err) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    cb();
  });
};

p.getOptionsFromRequest = function(req) {
  var opts = this.options;

  if (this.options.domain && req.headers.host in opts.domain) {
    // if domain match, use custom options
    opts = _.merge({}, opts, opts.domain[req.headers.host]);
  }

  if (this.options.header && req.headers['x-isteam-app'] in opts.header) {
    // if `x-isteam-app` header match, use custom options
    opts = _.merge({}, opts, opts.header[req.headers['x-isteam-app']]);
  }

  return opts;
};
