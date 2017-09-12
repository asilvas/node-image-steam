const path = require('path');
const async = require('async');
const crypto = require('crypto');
const zlib = require('zlib');
const { EventEmitter } = require('events');
const Router = require('../router');
const Storage = require('../storage');
const Processor = require('../processor');
const Security = require('../security');
const Throttle = require('./throttle');
const helpers = require('../helpers');
const commands = require('./commands');

module.exports = Connect;

function Connect(options) {
  if (!(this instanceof Connect)) {
    return new Connect(options);
  }

  EventEmitter.call(this);

  this.options = options || {};
  this.options.stepTimeout = this.options.stepTimeout || 60000;

  const errHandler = err => {
    this.emit('error', err);
  };
  const warnHandler = err => {
    this.emit('warn', err);
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

const p = Connect.prototype = new EventEmitter();

p.getHandler = function() {
  return (req, res) => {
    const emit = (lvl, err) => {
      err.method = req.method;
      err.url = req.url;
      this.emit(lvl, err);
    };

    const safeWriteHead = function () {
      try {
        res.writeHead.apply(res, Array.prototype.slice.call(arguments));
      } catch (ex) {
        emit('warn', ex);
        return false;
      }

      return true;
    };

    if (!this.throttle.startRequest(req, res)) {
      res.writeHead(503);
      return void res.end();
    }

    if (req.url === '/favicon.ico') {
      // reserved, never valid
      emit('warn', '/favicon.ico not currently supported');
      res.writeHead(404);
      return void res.end();
    }

    let reqInfo;
    try {
      reqInfo = this.router.getInfo(req);
    } catch (ex) {
      emit('error', ex);
      res.writeHead(400);
      return void res.end();
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200, { // should be 204, but 200 is most commonly accepted
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Max-Age': '864000', // 10 days
        'Content-Type': reqInfo.contentType || 'application/octet-stream' // default to binary if unknown
      });

      return void res.end();
    } else if (req.method === 'DELETE') {
      // extension required or directory allowed so long as not in root
      if (reqInfo.originalPath.indexOf('.') < 0 && reqInfo.originalPath.split('/').length < 3) {
        res.writeHead(400);
        return void res.end();
      }
      this.storage.deleteCache(req, reqInfo.originalPath, err => {
        if (err) {
          res.writeHead(400);
        } else {
          res.writeHead(204);
        }

        res.end();
      });

      return;
    } else if (req.method !== 'GET' && req.method !== 'HEAD') {
      this.emit('warn', 'METHOD ' + req.method + ' not allowed');
      res.writeHead(405);
      return void res.end();
    }

    try {
      this.security.checkSignature(reqInfo.toSign, reqInfo.signature);
    } catch (e){
      emit('error', e);
      if (e instanceof this.security.SecurityError) {
        res.writeHead(401);
      } else {
        res.writeHead(500);
      }
      return void res.end();
    }
  
    async.auto({
      getPrefetcher: async.timeout(cb => {
        // acquire prefetcher
        this.throttle.getPrefetcher(req, cb);
      }, this.options.stepTimeout),
      requestedImage: ['getPrefetcher', async.timeout((results, cb) => {
        if (!reqInfo.hashFromSteps) {
          // if no steps, continue
          return void cb();
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not get from storage
          return void cb();
        }

        this.storage.fetch(req, reqInfo.originalPath, reqInfo.hashFromSteps, (err, image) => {
          if (err) {
            return void cb();
          }

          if (image.info.byteSize !== image.buffer.length) {
            emit('warn', 'requestedImage.byteSize !== buffer.length');
            return void cb();
          }

          cb(null, image);
        });
      }, this.options.stepTimeout)],
      optimizedOriginalImage: ['requestedImage', async.timeout((results, cb) => {
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

        this.storage.fetch(req, reqInfo.originalPath, reqInfo.hashFromOptimizedOriginal, (err, image) => {
          if (err) {
            return void cb();
          }

          if (image.info.byteSize !== image.buffer.length) {
            emit('warn', 'optimizedOriginal.byteSize !== buffer.length may indicate a problem with storage driver');
            return void cb();
          }

          cb(null, image);
        });
      }, this.options.stepTimeout)],
      originalImage: ['optimizedOriginalImage', async.timeout((results, cb) => {
        if (results.requestedImage || results.optimizedOriginalImage) {
          // requested or optimized original image found, original not needed
          return void cb();
        }

        this.storage.fetch(req, reqInfo.originalPath, null, (err, image) => {
          if (err) {
            return void cb(err);
          }

          cb(null, image);
        });
      }, this.options.stepTimeout)],
      gzipAsset: ['originalImage', async.timeout((results, cb) => {
        if (!results.originalImage) {
          // not found, bail out
          return void cb();
        }
        if (!reqInfo.contentType) {
          // no need if image contentType
          return void cb();
        }

        const accept = req.headers['accept-encoding'] || '';
        if (!/gzip/i.test(accept)) {
          // all browsers support gzip, use it or nothing at all
          return void cb();
        }

        zlib.gzip(results.originalImage.buffer, (err, gzipBuffer) => {
          if (err) {
            // if compression fails, log it and move on. no need to fail request
            emit('warn', 'gzip failed, serving original');
            return void cb();
          }

          cb(null, gzipBuffer);
        })
      }, this.options.stepTimeout)],
      checkContentType: ['originalImage', async.timeout((results, cb) => {
        if (reqInfo.useOriginal) {
          helpers.imageType(results.originalImage, (err, contentType) => {
            if (err) return void cb(err);
            reqInfo.contentType = contentType;
            cb()
          });
        } else {
          cb();
        }
      }, this.options.stepTimeout)],
      hasProcessor: ['checkContentType','requestedImage', 'optimizedOriginalImage', 'originalImage', async.timeout((results, cb) => {
        if (reqInfo.contentType) {
          // no need if non-image contentType
          return void cb(null, false);
        }

        if (results.requestedImage) {
          // no need for processor if desired asset was found
          return void cb(null, false);
        }

        this.throttle.getProcessor(req, err => {
          if (err) return void cb(err);

          cb(null, true); // has processor
        });
      }, this.options.stepTimeout)],
      processedOptimizedImage: ['hasProcessor', 'optimizedOriginalImage', 'originalImage', async.timeout((results, cb) => {
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

        this.processor.process(results.originalImage, reqInfo.optimizedOriginalSteps, cb);
      }, this.options.stepTimeout)],
      commandHandler: ['processedOptimizedImage', (results, cb) => {
        if (!reqInfo.command) {
          return void cb();
        }

        // get the command handler
        const cmdHandler = commands[reqInfo.command.name];
        if (!cmdHandler) {
          emit('warn', 'COMMAND ' + reqInfo.command.name + ' not found');
          res.writeHead(404);
          return void res.end();
        }

        // get avail image to forward
        const img = results.optimizedOriginalImage // 1st priority
            || results.processedOptimizedImage // 2nd priority
            || results.originalImage // last resort
          ;
        
        // process the command
        cmdHandler.call(this, reqInfo.command, img, reqInfo, req, res);

        cb(); // no need to block
      }],
      processedImage: ['hasProcessor', 'processedOptimizedImage', 'originalImage', async.timeout((results, cb) => {
        if (reqInfo.command) {
          return void cb();
        }
        if (!results.hasProcessor) {
          return void cb();
        }

        const original = results.optimizedOriginalImage // 1st priority
            || results.processedOptimizedImage // 2nd priority
            || results.originalImage // last resort
          ;

        this.processor.process(original, reqInfo.imageSteps, cb);
      }, this.options.stepTimeout)],
      storeProcessedImage: ['processedImage', async.timeout((results, cb) => {
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
        this.storage.store(req, reqInfo.originalPath, reqInfo.hashFromSteps, results.processedImage, err => {
          // ignore, error bubbled up through events
        });
      }, this.options.stepTimeout)],
      storeOptimizedImage: ['processedOptimizedImage', async.timeout((results, cb) => {
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
        this.storage.store(req, reqInfo.originalPath, reqInfo.hashFromOptimizedOriginal, results.processedOptimizedImage, err => {
          // ignore, error bubbled up through events
        });
      }, this.options.stepTimeout)]
    }, (err, results) => {
      if (reqInfo.command) {
        return; // do nothing, it's already handled
      }
      
      if (err) {
        emit('error', err);
        if (err.code && err.code == 'ETIMEDOUT') {
          safeWriteHead(408);
        } else if (!results.originalImage && !results.optimizedOriginalImage) {
          safeWriteHead(404);
        } else {
          safeWriteHead(400);
        }
        return void res.end();
      }

      const image = results.requestedImage
          || results.processedImage
          || results.originalImage
        ;
      if (!image) {
        // should have errored instead of getting this far?
        safeWriteHead(404);
        return void res.end();
      }

      const etag = image.ETag;
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        // not modified, don't resend entire payload
        safeWriteHead(304);
        return void res.end();
      }

      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Max-Age': '864000', // 10 days
        'Cache-Control': 'public,max-age=31536000',
        'Content-Length': (results.gzipAsset && results.gzipAsset.length) || image.buffer.length,
        'Content-Type': reqInfo.contentType || image.contentType || 'application/octet-stream' // default to binary if unknown
      };

      if (results.gzipAsset) {
        headers['Vary'] = 'Accept-Encoding';
        headers['Content-Encoding'] = 'gzip';
      } else { // image
        headers['Vary'] = 'Accept';
      }

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
        const fileOrPath = image.info.filename || image.info.path;
        const friendlyName = path.basename(fileOrPath);
        if (image.info.format) {
          // only use this formatting if an image since we can detect format
          const oldExt = path.extname(fileOrPath);
          const newExt = '.' + (image.info.format === 'jpeg' ? 'jpg' : image.info.format);
          friendlyName = path.basename(fileOrPath, oldExt) + newExt;
        }
        headers['Content-Disposition'] = 'attachment; filename="'
          + friendlyName + '"'
        ;
      }

      if (req.method === 'HEAD') {
        safeWriteHead(204, headers);

        res.end();
      } else {
        safeWriteHead(200, headers);

        res.end(results.gzipAsset || image.buffer);
      }
    });
  };
};

