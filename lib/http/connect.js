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
      return void res.end('Busy, try again later');
    }

    var reqInfo;
    try {
      reqInfo = router.getInfo(req, storage);
    } catch (ex) {
      res.writeHead(400);
      return void res.end('Bad request ' + ex.stack);
    }

    async.auto({
      getPrefetcher: function(cb) {
        // acquire prfetcher
        throttle.getPrefetcher(req, cb);
      },
      requestedImage: ['getPrefetcher', function(cb) {
        if (!reqInfo.hashFromSteps) {
          // if no steps, continue
          return void cb(null, null);
        }

        if (reqInfo.urlInfo.query.cache === 'false') {
          // if skipCache is provided, do not get from storage
          return void cb(null, null);
        }

        storage.fetch(reqInfo.originalPath, reqInfo.hashFromSteps, function(err, requestedImage) {
          if (err) {
            return void cb(null, null);
          }

          cb(null, requestedImage);
        });
      }],
      originalImage: ['requestedImage', function(cb, results) {
        if (results.requestedImage) {
          // requested image found, no need for original
          return void cb(null, null);
        }

        storage.fetch(reqInfo.originalPath, null, function(err, originalImage) {
          if (err) {
            return void cb(err);
          }

          cb(null, originalImage);
        });
      }],
      hasProcessor: ['requestedImage', 'originalImage', function(cb, results) {
        if (results.requestedImage) {
          // no need for processor if desired asset was found
          return void cb(null, false);
        }

        throttle.getProcessor(req, function() {
          cb(null, true); // has processor
        });
      }],
      processedImage: ['hasProcessor', function(cb, results) {
        if (!results.hasProcessor) {
          return void cb();
        }

        processor.process(results.originalImage, reqInfo.imageSteps, cb);
      }],
      storeProcessedImage: ['processedImage', function(cb, results) {
        // don't wait to respond
        cb();

        if (!results.processedImage) {
          // no processed image to store
          return;
        }

        if (reqInfo.urlInfo.query.cache === 'false') {
          // if skipCache is provided, do not save to storage
          return void cb(null, null);
        }

        // store processed image
        storage.store(reqInfo.originalPath, reqInfo.hashFromSteps, results.processedImage, function(err) {
          // todo: log err
        });
      }]
    }, function(err, results) {
      if (err) {
        // todo: need smarter error handling!!!
        if (!results.originalImage) {
          res.writeHead(404);
          return void res.end('not found');
        } else {
          res.writeHead(400);
          return void res.end('not yet implemented');
        }
      }

      var image = results.requestedImage || results.processedImage;
      if (!image) {
        // should have errored instead of getting this far?
        res.writeHead(404);
        return void res.end('not found');
      }

      var headers = {
        'Content-Length': image.buffer.length,
        'Content-Type': image.contentType
      };

      if (image.info.width) {
        headers['x-width'] = image.info.width;
      }
      if (image.info.height) {
        headers['x-height'] = image.info.height;
      }

      // todo: adding caching headers

      res.writeHead(200, headers);

      res.end(image.buffer);
    });
  };
}
