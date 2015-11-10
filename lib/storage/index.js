var path = require('path');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Image = require('../image');
var StorageBase = require('./storage-base');

module.exports = Storage;

function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  EventEmitter.call(this);

  this.options = options
    || { driver: 'fs', path: process.cwd() }
  ;

  // drivers will be initialized on-demand due to the light weight nature of design
  this.drivers = {};
}

Storage.Base = StorageBase;

var p = Storage.prototype = new EventEmitter();

p.getDriver = function(options) {
  var driver = this.drivers['byPath/' + options.driverPath] // use driverPath if applicable
    || this.drivers['byName/' + options.driver] // use driver name if applicable
  ;

  function createDriver(opts) {
    var driver;

    if (opts.driverPath) {
      driver = new (require(opts.driverPath))(opts);
      driver.name = 'byPath/' + opts.driverPath;
    } else {
      driver = new (require('./' + opts.driver))(opts);
      driver.name = 'byName/' + opts.driver;
    }

    return driver;
  }

  if (!driver) {
    // if not found, create it
    driver = createDriver(options);

    // store by name
    this.drivers[driver.name] = driver;
  }

  return driver;
};

p.fetch = function(req, originalPath, stepsHash, cb) {
  var $this = this;
  var reqInfo;
  try {
    reqInfo = this.getRequestInfo(originalPath, req, stepsHash);
  } catch (ex) {
    this.emit('warn', ex);
    return void cb(err);
  }
  reqInfo.driver.fetch(reqInfo.options, reqInfo.realPath, stepsHash, function(err, img, imgData) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    // backward compatible
    if (!(img instanceof Image)) {
      img = new Image(img, imgData);
    }

    cb(null, img);
  });
};

p.store = function(req, originalPath, stepsHash, image, cb) {
  var $this = this;
  var reqInfo;
  try {
    reqInfo = this.getRequestInfo(originalPath, req, stepsHash);
  } catch (ex) {
    this.emit('warn', ex);
    return void cb(err);
  }
  reqInfo.driver.store(reqInfo.options, reqInfo.realPath, stepsHash, image, function(err) {
    if (err) {
      $this.emit('warn', err);
      return void cb(err);
    }

    cb();
  });
};

p.getRequestInfo = function(originalPath, req, stepsHash) {
  var opts = this.options;
  var realPath = originalPath;

  if (this.options.app) {
    var parts = originalPath.split('/');
    var firstPart = parts[0];
    if (firstPart in opts.app) {
      // if app match, use custom options
      opts = _.merge({}, opts, opts.app[firstPart]);
      realPath = originalPath.substr(firstPart.length + 1);
    }
  }

  if (this.options.domain && req.headers.host in opts.domain) {
    // if domain match, use custom options
    opts = _.merge({}, opts, opts.domain[req.headers.host]);
  }

  if (this.options.header && req.headers['x-isteam-app'] in opts.header) {
    // if `x-isteam-app` header match, use custom options
    opts = _.merge({}, opts, opts.header[req.headers['x-isteam-app']]);
  }

  if (!!stepsHash && this.options.cache) { // use cache if enabled
    opts = _.merge({}, this.options, this.options.cache);

    // fully qualify path when using cache
    realPath = originalPath;
  }

  return {
    driver: this.getDriver(opts),
    options: opts,
    realPath: realPath
  };
};
