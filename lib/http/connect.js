var path = require('path');
var async = require('async');
var Router = require('../router');
var Storage = require('../storage');
var Processor = require('../processor');
var Throttle = require('./throttle');

module.exports = Connect;

function Connect(options) {
  if (!(this instanceof Connect)) {
    return new Connect(options);
  }

  options = options || {};

  var router = options.router instanceof Router
    ? options.router
    : new Router(options.router)
  ;
  var storage = options.storage instanceof Storage
    ? options.storage
    : new Storage(options.storage)
  ;
  var processor = new Processor(options.processor);
  var throttle = new Throttle(options.throttle);

  return function(req, res) {
    if (!throttle.startRequest(req, res)) {
      res.writeHead(503);
      return void res.end();
    }

    if (req.url === '/favicon.ico') {
      // reserved, never valid
      res.writeHead(404);
      return void res.end();
    }

    var reqInfo;
    try {
      reqInfo = router.getInfo(req);
    } catch (ex) {
      console.error('router.getInfo failed', (ex.stack || ex));
      res.writeHead(400);
      return void res.end(ex.toString());
    }

    async.auto({
      getPrefetcher: function(cb) {
        // acquire prfetcher
        throttle.getPrefetcher(req, cb);
      },
      requestedImage: ['getPrefetcher', function(cb) {
        if (!reqInfo.hashFromSteps) {
          // if no steps, continue
          return void cb();
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not get from storage
          return void cb();
        }

        storage.fetch(reqInfo.originalPath, reqInfo.hashFromSteps, function(err, image) {
          if (err) {
            // console.error('storage.fetch (desired) failed', (err.stack || err));
            return void cb();
          }

          cb(null, image);
        });
      }],
      optimizedOriginalImage: ['requestedImage', function(cb, results) {
        if (results.requestedImage) {
          // requested image found, no need for optimized original
          return void cb();
        }
        if (!router.hashFromOptimizedOriginal) {
          // no optimized original steps, feature disabled
          return void cb();
        }
        if (reqInfo.hashFromSteps === router.hashFromOptimizedOriginal) {
          // rare chance they're the same, but if so no sense in requesting the same thing
          return void cb();
        }
        if (reqInfo.urlInfo.query.useOriginal === 'true') {
          // ignore optimized original if request explicitly opting out
          return void cb();
        }

        storage.fetch(reqInfo.originalPath, router.hashFromOptimizedOriginal, function(err, image) {
          if (err) {
            // console.error('storage.fetch (optimized) failed', (err.stack || err));
            return void cb();
          }

          cb(null, image);
        });
      }],
      originalImage: ['optimizedOriginalImage', function(cb, results) {
        if (results.requestedImage || results.optimizedOriginalImage) {
          // requested or optimized original image found, original not needed
          return void cb();
        }

        storage.fetch(reqInfo.originalPath, null, function(err, image) {
          if (err) {
            // console.error('storage.fetch (original) failed', (err.stack || err));
            return void cb(err);
          }

          cb(null, image);
        });
      }],
      hasProcessor: ['requestedImage', 'optimizedOriginalImage', 'originalImage', function(cb, results) {
        if (results.requestedImage) {
          // no need for processor if desired asset was found
          return void cb(null, false);
        }

        throttle.getProcessor(req, function() {
          cb(null, true); // has processor
        });
      }],
      processedOptimizedImage: ['hasProcessor', 'optimizedOriginalImage', 'originalImage', function(cb, results) {
        if (!results.hasProcessor) {
          return void cb();
        }

        if (results.optimizedOriginalImage) {
          // already have it
          return void cb();
        }
        if (!router.hashFromOptimizedOriginal) {
          // no optimized original steps, feature disabled
          return void cb();
        }
        if (reqInfo.hashFromSteps === router.hashFromOptimizedOriginal) {
          // rare chance they're the same, but if so no sense in requesting the same thing
          return void cb();
        }
        if (reqInfo.urlInfo.query.useOriginal === 'true') {
          // ignore optimized original if request explicitly opting out
          return void cb();
        }

        processor.process(results.originalImage, router.optimizedOriginalSteps, cb);
      }],
      processedImage: ['hasProcessor', 'processedOptimizedImage', 'originalImage', function(cb, results) {
        if (!results.hasProcessor) {
          return void cb();
        }

        var original = results.optimizedOriginalImage // 1st priority
          || results.processedOptimizedImage // 2nd priority
          || results.originalImage // last resort
        ;

        processor.process(original, reqInfo.imageSteps, cb);
      }],
      storeProcessedImage: ['processedImage', function(cb, results) {
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

        // store processed image
        storage.store(reqInfo.originalPath, reqInfo.hashFromSteps, results.processedImage, function(err) {
          if (err) {
            console.error('storage.store (processed) failed', (err.stack || err));
          }
        });
      }],
      storeOptimizedImage: ['processedOptimizedImage', function(cb, results) {
        // don't wait to respond
        cb();

        if (!results.processedOptimizedImage) {
          // no *processed* optimized original image to store
          return;
        }

        if (reqInfo.hashFromSteps === router.hashFromOptimizedOriginal) {
          // in the off chance the steps are identical, lets not duplicate writes
          return;
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not save to storage
          return;
        }

        // store processed image
        storage.store(reqInfo.originalPath, router.hashFromOptimizedOriginal, results.processedOptimizedImage, function(err) {
          if (err) {
            console.error('storage.store (optimized) failed', (err.stack || err));
          }
        });
      }]
    }, function(err, results) {
      if (err) {
        console.error(err.stack || err);
        if (!results.originalImage && !results.optimizedOriginalImage) {
          res.writeHead(404);
          return void res.end();
        } else {
          res.writeHead(400);
          return void res.end();
        }
      }

      var image = results.requestedImage
        || results.processedImage
      ;
      if (!image) {
        // should have errored instead of getting this far?
        res.writeHead(404);
        return void res.end();
      }

      var headers = {
        'Vary': 'Accept',
        'Cache-Control': 'max-age=31536000',
        'Content-Length': image.buffer.length,
        'Content-Type': image.contentType
      };

      if (image.info.width) {
        headers['x-width'] = image.info.width;
      }
      if (image.info.height) {
        headers['x-height'] = image.info.height;
      }

      if (reqInfo.urlInfo.query.download !== undefined) {
        // use filename as the friendly download name, otherwise path
        var fileOrPath = image.info.filename || image.info.path;
        var oldExt = path.extname(fileOrPath);
        var newExt = '.' + (image.info.format === 'jpeg' ? 'jpg' : image.info.format);
        var friendlyName = path.basename(fileOrPath, oldExt) + newExt;
        headers['Content-Disposition'] = 'attachment; filename="'
          + friendlyName + '"'
        ;
      }

      res.writeHead(200, headers);

      res.end(image.buffer);
    });
  };
}
