var path = require('path');
var async = require('async');
var crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var Router = require('../router');
var Storage = require('../storage');
var Processor = require('../processor');
var Security = require('../security');
var Throttle = require('./throttle');
var helpers = require('../helpers');


module.exports = Connect;

function Connect(options) {
  if (!(this instanceof Connect)) {
    return new Connect(options);
  }

  EventEmitter.call(this);

  this.options = options || {};
  this.options.stepTimeout = this.options.stepTimeout || 60000;

  var $this = this;
  var errHandler = function(err) {
    $this.emit('error', err);
  };
  var warnHandler = function(err) {
    $this.emit('warn', err);
  };

  this.router = this.options.router instanceof Router
    ? this.options.router
    : new Router(this.options.router)
  ;
  this.router.on('error', errHandler);
  this.router.on('warn', warnHandler);
  this.storage = this.options.storage instanceof Storage
    ? this.options.storage
    : new Storage(this.options.storage)
  ;
  this.storage.on('error', errHandler);
  this.storage.on('warn', warnHandler);
  this.processor = new Processor(this.options.processor);
  this.processor.on('error', errHandler);
  this.processor.on('warn', warnHandler);
  this.throttle = new Throttle(this.options.throttle);
  this.throttle.on('error', errHandler);
  this.throttle.on('warn', warnHandler);
  this.security = new Security(this.options.security);
  this.security.on('error', errHandler);
  this.security.on('warn', warnHandler);
}

var p = Connect.prototype = new EventEmitter();

p.getHandler = function() {
  var $this = this;

  return function(req, res) {
    if (!$this.throttle.startRequest(req, res)) {
      res.writeHead(503);
      return void res.end();
    }

    if (req.url === '/favicon.ico') {
      // reserved, never valid
      $this.emit('warn', '/favicon.ico not currently supported');
      res.writeHead(404);
      return void res.end();
    }

    var reqInfo;
    try {
      reqInfo = $this.router.getInfo(req);
    } catch (ex) {
      ex.url = req.url;
      $this.emit('error', ex);
      res.writeHead(400);
      return void res.end();
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200, { // should be 204, but 200 is most commonly accepted
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Max-Age': '864000', // 10 days
        'Content-Type': reqInfo.contentType
      });

      return void res.end();
    } else if (req.method !== 'GET' && req.method !== 'HEAD') {
      this.emit('warn', 'METHOD ' + req.method + ' not allowed');
      res.writeHead(405);
      return void res.end();
    }

    try {
      $this.security.checkSignature(reqInfo.toSign, reqInfo.signature);
    } catch (e){
      $this.emit('error', e);
      if (e instanceof $this.security.SecurityError) {
        res.writeHead(401);
      } else {
        res.writeHead(500);
      }
      return void res.end();
    }
  
    async.auto({
      getPrefetcher: async.timeout(function getPrefetcher(cb) {
        // acquire prfetcher
        $this.throttle.getPrefetcher(req, cb);
      }, $this.options.stepTimeout),
      requestedImage: ['getPrefetcher', async.timeout(function requestedImage(results, cb) {
        if (!reqInfo.hashFromSteps) {
          // if no steps, continue
          return void cb();
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not get from storage
          return void cb();
        }

        $this.storage.fetch(req, reqInfo.originalPath, reqInfo.hashFromSteps, function(err, image) {
          if (err) {
            return void cb();
          }

          if (image.info.byteSize !== image.buffer.length) {
            $this.emit('warn', 'requestedImage.byteSize !== buffer.length');
            return void cb();
          }

          cb(null, image);
        });
      }, $this.options.stepTimeout)],
      optimizedOriginalImage: ['requestedImage', async.timeout(function optimizedOriginalImage(results, cb) {
        if (reqInfo.useOriginal || reqInfo.urlInfo.query.useOriginal === 'true') {
          // no need if non-image contentType
          return void cb();
        }
        if (reqInfo.contentType) {
          // no need if non-image contentType
          return void cb();
        }
        if (results.requestedImage) {
          // requested image found, no need for optimized original
          return void cb();
        }
        if (!reqInfo.hashFromOptimizedOriginal) {
          // no optimized original steps, feature disabled
          return void cb();
        }
        if (reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal) {
          // rare chance they're the same, but if so no sense in requesting the same thing
          return void cb();
        }

        $this.storage.fetch(req, reqInfo.originalPath, reqInfo.hashFromOptimizedOriginal, function(err, image) {
          if (err) {
            return void cb();
          }

          if (image.info.byteSize !== image.buffer.length) {
            $this.emit('warn', 'optimizedOriginal.byteSize !== buffer.length');
            return void cb();
          }

          cb(null, image);
        });
      }, $this.options.stepTimeout)],
      originalImage: ['optimizedOriginalImage', async.timeout(function originalImage(results, cb) {
        if (results.requestedImage || results.optimizedOriginalImage) {
          // requested or optimized original image found, original not needed
          return void cb();
        }

        $this.storage.fetch(req, reqInfo.originalPath, null, function(err, image) {
          if (err) {
            return void cb(err);
          }

          cb(null, image);
        });
      }, $this.options.stepTimeout)],
      checkContentType: ['originalImage', async.timeout(function checkContentType(results,cb){
        if (reqInfo.useOriginal) {
          helpers.imageType(results.originalImage,function(err, contentType){
            if (err) return void cb(err);
            reqInfo.contentType = contentType;
            cb()
          });
        } else {
          cb();
        }
      }, $this.options.stepTimeout)],
      hasProcessor: ['checkContentType','requestedImage', 'optimizedOriginalImage', 'originalImage', async.timeout(function hasProcessor(results, cb) {
        if (reqInfo.contentType) {
          // no need if non-image contentType
          return void cb(null, false);
        }

        if (results.requestedImage) {
          // no need for processor if desired asset was found
          return void cb(null, false);
        }

        $this.throttle.getProcessor(req, function() {
          cb(null, true); // has processor
        });
      }, $this.options.stepTimeout)],
      processedOptimizedImage: ['hasProcessor', 'optimizedOriginalImage', 'originalImage', async.timeout(function processedOptimizedImage(results, cb) {
        if (!results.hasProcessor) {
          return void cb();
        }
        if (reqInfo.urlInfo.query.useOriginal === 'true') {
          return void cb();
        }
        if (results.optimizedOriginalImage) {
          // already have it
          return void cb();
        }
        if (!reqInfo.hashFromOptimizedOriginal) {
          // no optimized original steps, feature disabled
          return void cb();
        }
        if (reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal) {
          // rare chance they're the same, but if so no sense in requesting the same thing
          return void cb();
        }

        $this.processor.process(results.originalImage, reqInfo.optimizedOriginalSteps, cb);
      }, $this.options.stepTimeout)],
      processedImage: ['hasProcessor', 'processedOptimizedImage', 'originalImage', async.timeout(function processedImage(results, cb) {
        if (!results.hasProcessor) {
          return void cb();
        }

        var original = results.optimizedOriginalImage // 1st priority
            || results.processedOptimizedImage // 2nd priority
            || results.originalImage // last resort
          ;

        $this.processor.process(original, reqInfo.imageSteps, cb);
      }, $this.options.stepTimeout)],
      storeProcessedImage: ['processedImage', async.timeout(function storeProcessedImage(results, cb) {
        // don't wait to respond
        cb();

        if (!results.processedImage) {
          // no processed image to store
          return;
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not save to storage
          return;
        }

        // track address of author
        results.processedImage.info.author = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // store processed image
        $this.storage.store(req, reqInfo.originalPath, reqInfo.hashFromSteps, results.processedImage, function(err) {
          // ignore, error bubbled up through events
        });
      }, $this.options.stepTimeout)],
      storeOptimizedImage: ['processedOptimizedImage', async.timeout(function storeOptimizedImage(results, cb) {
        // don't wait to respond
        cb();

        if (!results.processedOptimizedImage) {
          // no *processed* optimized original image to store
          return;
        }

        if (reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal) {
          // in the off chance the steps are identical, lets not duplicate writes
          return;
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not save to storage
          return;
        }

        // track address of author
        results.processedOptimizedImage.info.author = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // store processed image
        $this.storage.store(req, reqInfo.originalPath, reqInfo.hashFromOptimizedOriginal, results.processedOptimizedImage, function(err) {
          // ignore, error bubbled up through events
        });
      }, $this.options.stepTimeout)]
    }, function(err, results) {
      if (err) {
        err.url = req.url;
        $this.emit('error', err);
        if (err.code && err.code == 'ETIMEDOUT') {
          res.writeHead(408);
        } else if (!results.originalImage && !results.optimizedOriginalImage) {
          res.writeHead(404);
        } else {
          res.writeHead(400);
        }
        return void res.end();
      }

      var image = results.requestedImage
          || results.processedImage
          || results.originalImage
        ;
      if (!image) {
        // should have errored instead of getting this far?
        res.writeHead(404);
        return void res.end();
      }

      var etag = image.ETag;
      var ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        // not modified, don't resend entire payload
        res.writeHead(304);
        return void res.end();
      }

      var headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Max-Age': '864000', // 10 days
        'Vary': 'Accept',
        'Cache-Control': 'public,max-age=31536000',
        'Content-Length': image.buffer.length,
        'Content-Type': reqInfo.contentType || image.contentType
      };

      if (etag) {
        headers['ETag'] = etag;
      }

      if (image.info.width) {
        headers['x-width'] = image.info.width;
      }
      if (image.info.height) {
        headers['x-height'] = image.info.height;
      }

      if (reqInfo.urlInfo.query.download !== undefined) {
        // use filename as the friendly download name, otherwise path
        var fileOrPath = image.info.filename || image.info.path;
        var friendlyName = path.basename(fileOrPath);
        if (image.info.format) {
          // only use this formatting if an image since we can detect format
          var oldExt = path.extname(fileOrPath);
          var newExt = '.' + (image.info.format === 'jpeg' ? 'jpg' : image.info.format);
          friendlyName = path.basename(fileOrPath, oldExt) + newExt;
        }
        headers['Content-Disposition'] = 'attachment; filename="'
          + friendlyName + '"'
        ;
      }

      if (req.method === 'HEAD') {
        res.writeHead(204, headers);

        res.end();
      } else {
        res.writeHead(200, headers);

        res.end(image.buffer);
      }
    });
  };
};
