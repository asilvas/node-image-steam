import path from 'node:path';
import zlib from 'node:zlib';
import { EventEmitter } from 'node:events';
import Router from '../router/index.ts';
import Storage from '../storage/index.ts';
import Processor from '../processor/index.ts';
import Security from '../security/index.ts';
import Throttle from './throttle.ts';
import helpers from '../helpers/index.ts';
import commands from './commands/index.ts';

export default class Connect extends EventEmitter {
  options: any;
  router: Router;
  storage: Storage;
  processor: Processor;
  throttle: Throttle;
  security: Security;

  constructor(options?: any) {
    super();

    this.options = options || {};
    this.options.stepTimeout = this.options.stepTimeout || 60000;

    const errHandler = (err: any) => {
      this.emit('error', err);
    };
    const warnHandler = (err: any) => {
      this.emit('warn', err);
    };

    this.router =
      this.options.router instanceof Router
        ? this.options.router
        : new Router(this.options);
    this.router.on('error', errHandler);
    this.router.on('warn', warnHandler);
    this.storage =
      this.options.storage instanceof Storage
        ? this.options.storage
        : new Storage(this.options.storage);
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

  getHandler() {
    return (req: any, res: any) => {
      const emit = (lvl: string, err: any) => {
        if (typeof err === 'string') {
          err = { message: err };
        }
        err.method = req.method;
        err.referer = req.headers['referer'];
        err.url = req.url;
        this.emit(lvl, err);
      };

      const safeWriteHead = function (...args: any[]) {
        try {
          res.writeHead.apply(res, args);
        } catch (ex) {
          emit('warn', ex);
          return false;
        }

        return true;
      };

      if (req.url === '/') {
        res.writeHead(404);
        return void res.end();
      } else if (req.url === '/favicon.ico') {
        // reserved, never valid
        emit('warn', '/favicon.ico not currently supported');
        res.writeHead(404);
        return void res.end();
      }

      if (!this.throttle.startRequest(req, res)) {
        emit('error', `Throttling request '${req.url}' (503 too busy)`);
        res.writeHead(503);
        return void res.end();
      }

      let reqInfo: any;
      try {
        reqInfo = this.router.getInfo(req, this.options);
      } catch (ex) {
        emit('error', ex);
        res.writeHead(400);
        return void res.end();
      }

      try {
        reqInfo.storageOptions = this.storage.getDriverInfo(
          reqInfo.originalPath,
          req,
          {}
        );
      } catch (ex) {
        emit('warn', ex);
      }

      const cmdHandler: any =
        reqInfo.command && (commands as any)[reqInfo.command.name];
      if (reqInfo.command && !cmdHandler) {
        emit('warn', new Error(`COMMAND ${reqInfo.command.name} not found`));
        res.writeHead(404);
        return void res.end();
      }

      if (
        req.method === 'OPTIONS' &&
        (!cmdHandler || cmdHandler.cors !== false)
      ) {
        res.writeHead(200, {
          // should be 204, but 200 is most commonly accepted
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Max-Age': '864000', // 10 days
          'Content-Type': reqInfo.contentType || 'application/octet-stream', // default to binary if unknown
        });

        return void res.end();
      } else if (req.method === 'DELETE') {
        // extension required or directory allowed so long as not in root
        if (
          reqInfo.originalPath.indexOf('.') < 0 &&
          reqInfo.originalPath.split('/').length < 3
        ) {
          res.writeHead(400);
          return void res.end();
        }
        this.storage.deleteCache(req, reqInfo, (err: any) => {
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
      } catch (e) {
        emit('error', e);
        if (e instanceof this.security.SecurityError) {
          res.writeHead(401);
        } else {
          res.writeHead(500);
        }
        return void res.end();
      }

      // Request flow. Previously an async.auto graph, but the dependencies
      // were effectively linear -- a hand-rolled chain avoids the per-request
      // graph bookkeeping and only arms timeout timers for steps that
      // actually perform async work (guards are evaluated synchronously).
      const results: any = {};
      let finished = false;

      const finish = (err?: any) => {
        if (finished) return;
        finished = true;
        respond(err);
      };

      // runs an async step with stepTimeout semantics matching async.timeout
      const step = (name: string, fn: (cb: any) => void, next: () => void) => {
        let called = false;
        const done = (err?: any, value?: any) => {
          if (called || finished) return;
          called = true;
          clearTimeout(timer);
          if (err) return void finish(err);
          results[name] = value;
          next();
        };
        const timer = setTimeout(() => {
          const err: any = new Error(`Callback function "${name}" timed out.`);
          err.code = 'ETIMEDOUT';
          done(err);
        }, this.options.stepTimeout);
        try {
          fn(done);
        } catch (ex) {
          done(ex);
        }
      };

      const getPrefetcher = () => {
        step(
          'getPrefetcher',
          (cb) => this.throttle.getPrefetcher(req, cb),
          requestedImage
        );
      };

      const requestedImage = () => {
        if (
          !reqInfo.hashFromSteps ||
          reqInfo.optimized || // if no steps, continue
          !reqInfo.isCachable || // if skipCache is provided, do not get from storage
          this.storage.options.cacheArtifacts === false // optionally artifacts can be disabled
        ) {
          return void optimizedOriginalImage();
        }

        step(
          'requestedImage',
          (cb) => {
            this.storage.fetch(
              req,
              reqInfo,
              { hash: reqInfo.hashFromSteps },
              (err: any, image: any) => {
                if (err) {
                  return void cb();
                }

                if (image.info.byteSize !== image.buffer.length) {
                  emit('warn', 'requestedImage.byteSize !== buffer.length');
                  return void cb();
                }

                cb(null, image);
              }
            );
          },
          optimizedOriginalImage
        );
      };

      const optimizedOriginalImage = () => {
        if (
          reqInfo.useOriginal ||
          reqInfo.urlInfo.query.useOriginal === 'true' ||
          reqInfo.contentType || // no need if non-image contentType
          results.requestedImage || // requested image found, no need for optimized original
          !reqInfo.hashFromOptimizedOriginal || // no optimized original steps, feature disabled
          // rare chance they're the same, but if so no sense in requesting the same thing
          // exception: unless optimized are stored in a different location
          (reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal &&
            !this.storage.options.cacheOptimized) ||
          !reqInfo.isCachable // if skipCache is provided, do not get from storage
        ) {
          return void refreshImageArtifact();
        }

        step(
          'optimizedOriginalImage',
          (cb) => {
            this.storage.fetch(
              req,
              reqInfo,
              { hash: reqInfo.hashFromOptimizedOriginal },
              (err: any, image: any) => {
                if (err) {
                  return void cb();
                }

                if (image.info.byteSize !== image.buffer.length) {
                  emit(
                    'warn',
                    'optimizedOriginal.byteSize !== buffer.length may indicate a problem with storage driver'
                  );
                  return void cb();
                }

                cb(null, image);
              }
            );
          },
          refreshImageArtifact
        );
      };

      const refreshImageArtifact = () => {
        const image = results.requestedImage;
        const tts = this.storage.options.cacheTTS;
        if (!image || !tts || !image.info.lastModified) {
          return void refreshOptimizedOriginal();
        }

        // age of file in seconds
        const deltaS = (Date.now() - image.info.lastModified.valueOf()) / 1000;
        if (deltaS < tts) {
          // not yet stale
          return void refreshOptimizedOriginal();
        }

        // if we've gotten this far, the object is stale, touch it!
        step(
          'refreshImageArtifact',
          (cb) => {
            this.storage.store(
              req,
              reqInfo,
              { hash: reqInfo.hashFromSteps, touch: true },
              image,
              (err: any) => {
                if (err) {
                  emit(
                    'warn',
                    `storage.touch.err: ${err.stack || err.message}`
                  );
                }

                // do not forward error if a benign touch fails
                cb();
              }
            );
          },
          refreshOptimizedOriginal
        );
      };

      const refreshOptimizedOriginal = () => {
        const image = results.optimizedOriginalImage;
        const tts =
          this.storage.options.cacheOptimizedTTS ||
          this.storage.options.cacheTTS;
        if (!image || !tts || !image.info.lastModified) {
          return void originalImage();
        }

        // age of file in seconds
        const deltaS = (Date.now() - image.info.lastModified.valueOf()) / 1000;
        if (deltaS < tts) {
          // not yet stale
          return void originalImage();
        }

        // if we've gotten this far, the object is stale, touch it!
        step(
          'refreshOptimizedOriginal',
          (cb) => {
            this.storage.store(
              req,
              reqInfo,
              { hash: reqInfo.hashFromOptimizedOriginal, touch: true },
              image,
              (err: any) => {
                if (err) {
                  emit(
                    'warn',
                    `storage.touch.err: ${err.stack || err.message}`
                  );
                }

                // do not forward error if a benign touch fails
                cb();
              }
            );
          },
          originalImage
        );
      };

      const originalImage = () => {
        if (results.requestedImage || results.optimizedOriginalImage) {
          // requested or optimized original image found, original not needed
          return void gzipAsset();
        }

        step(
          'originalImage',
          (cb) => {
            this.storage.fetch(req, reqInfo, {}, (err: any, image: any) => {
              if (err) {
                err.status = 404;
                return void cb(err);
              }

              cb(null, image);
            });
          },
          gzipAsset
        );
      };

      const gzipAsset = () => {
        if (!results.originalImage || !reqInfo.contentType) {
          // not found, or image contentType -- no gzip needed
          return void checkContentType();
        }

        const accept = req.headers['accept-encoding'] || '';
        if (!/gzip/i.test(accept)) {
          // all browsers support gzip, use it or nothing at all
          return void checkContentType();
        }

        step(
          'gzipAsset',
          (cb) => {
            zlib.gzip(
              results.originalImage.buffer,
              (err: any, gzipBuffer: Buffer) => {
                if (err) {
                  // if compression fails, log it and move on. no need to fail request
                  emit('warn', 'gzip failed, serving original');
                  return void cb();
                }

                cb(null, gzipBuffer);
              }
            );
          },
          checkContentType
        );
      };

      const checkContentType = () => {
        if (!reqInfo.useOriginal) {
          return void hasProcessor();
        }

        step(
          'checkContentType',
          (cb) => {
            helpers.imageType(
              results.originalImage,
              (err?: Error | null, contentType?: string) => {
                if (err) return void cb(err);
                reqInfo.contentType = contentType;
                cb();
              }
            );
          },
          hasProcessor
        );
      };

      const hasProcessor = () => {
        if (
          reqInfo.contentType || // no need if non-image contentType
          results.requestedImage ||
          (results.optimizedOriginalImage && reqInfo.optimized === true)
        ) {
          // no need for processor if desired asset was found
          results.hasProcessor = false;
          return void processedOptimizedImage();
        }

        step(
          'hasProcessor',
          (cb) => {
            this.throttle.getProcessor(req, (err: any) => {
              if (err) return void cb(err);

              cb(null, true); // has processor
            });
          },
          processedOptimizedImage
        );
      };

      const processedOptimizedImage = () => {
        if (
          !results.hasProcessor ||
          reqInfo.urlInfo.query.useOriginal === 'true' ||
          results.optimizedOriginalImage || // already have it
          !reqInfo.hashFromOptimizedOriginal || // no optimized original steps, feature disabled
          // rare chance they're the same, but if so no sense in requesting the same thing
          reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal ||
          !reqInfo.isCachable // if skipCache is provided, do not create optimized
        ) {
          return void commandHandler();
        }

        step(
          'processedOptimizedImage',
          (cb) => {
            this.processor.process(
              results.originalImage,
              reqInfo.originalSteps,
              {
                hqOriginalMaxPixels: this.router.options.hqOriginalMaxPixels,
                hqOriginalSteps: reqInfo.hqOriginalSteps,
              },
              reqInfo.storageOptions.options,
              cb
            );
          },
          () => {
            storeOptimizedImage(); // fire-and-forget, never blocks the response
            commandHandler();
          }
        );
      };

      const commandHandler = () => {
        if (!cmdHandler) {
          return void processedImage();
        }

        // if cors request but not permitted, bail out
        if (cmdHandler.cors === false && req.headers['origin']) {
          return void finish(
            new Error(`Command ${reqInfo.command.name} does not allow CORS`)
          );
        }

        // get avail image to forward
        const img =
          results.optimizedOriginalImage || // 1st priority
          results.processedOptimizedImage || // 2nd priority
          results.originalImage; // last resort
        if (!img) return void finish(new Error('Command requires image'));

        // basic CORS support
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', 'GET');
        res.setHeader('Access-Control-Max-Age', '864000');

        // process the command
        cmdHandler.call(this, reqInfo.command, img, reqInfo, req, res);

        processedImage(); // no need to block
      };

      const processedImage = () => {
        if (
          reqInfo.command ||
          reqInfo.useOriginal ||
          reqInfo.optimized ||
          !results.hasProcessor
        ) {
          return void finish();
        }

        const original =
          results.optimizedOriginalImage || // 1st priority
          results.processedOptimizedImage || // 2nd priority
          results.originalImage; // last resort
        step(
          'processedImage',
          (cb) => {
            this.processor.process(
              original,
              reqInfo.imageSteps,
              {},
              reqInfo.storageOptions.options,
              cb
            );
          },
          () => {
            storeProcessedImage(); // fire-and-forget, never blocks the response
            finish();
          }
        );
      };

      const storeProcessedImage = () => {
        if (!results.processedImage) {
          // no processed image to store
          return;
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not save to storage
          return;
        }

        if (this.storage.options.cacheArtifacts === false) {
          // optionally artifacts can be disabled
          return;
        }

        // store processed image
        this.storage.store(
          req,
          reqInfo,
          { hash: reqInfo.hashFromSteps },
          results.processedImage,
          (err: any) => {
            // ignore, error bubbled up through events
          }
        );
      };

      const storeOptimizedImage = () => {
        if (!results.processedOptimizedImage) {
          // no *processed* optimized original image to store
          return;
        }

        if (
          reqInfo.hashFromSteps === reqInfo.hashFromOptimizedOriginal &&
          !this.storage.options.cacheOptimized
        ) {
          // in the off chance the steps are identical, lets not duplicate writes
          // exception: unless optimized are stored in a different location
          return;
        }

        if (!reqInfo.isCachable) {
          // if skipCache is provided, do not save to storage
          return;
        }

        // store processed image
        this.storage.store(
          req,
          reqInfo,
          { hash: reqInfo.hashFromOptimizedOriginal },
          results.processedOptimizedImage,
          (err: any) => {
            // ignore, error bubbled up through events
          }
        );
      };

      const respond = (err?: any) => {
        if (err) {
          if (err.code && err.code === 'ETIMEDOUT') {
            emit('error', err);
            safeWriteHead(408);
          } else if (
            !results.originalImage &&
            !results.optimizedOriginalImage
          ) {
            emit('warn', err);
            safeWriteHead(404);
          } else {
            emit('error', err);
            safeWriteHead(400);
          }
          return void res.end();
        }

        if (reqInfo.command) {
          return; // do nothing, it's already handled
        }

        const image =
          results.requestedImage ||
          results.processedImage ||
          (reqInfo.optimized === true &&
            (results.optimizedOriginalImage ||
              results.processedOptimizedImage)) ||
          results.originalImage;
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

        const headers: any = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Max-Age': '864000', // 10 days
          'Cache-Control': 'public,max-age=31536000',
          'Content-Length':
            (results.gzipAsset && results.gzipAsset.length) ||
            (image.buffer && image.buffer.length) ||
            0,
          'Content-Type':
            reqInfo.contentType ||
            image.contentType ||
            'application/octet-stream', // default to binary if unknown
        };

        if (results.gzipAsset) {
          headers['Vary'] = 'Accept-Encoding';
          headers['Content-Encoding'] = 'gzip';
        } else {
          // image
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
        if (!isNaN(image.info.orientation)) {
          // for now this is the only meta we're willing to forward
          headers['x-isteam-meta'] = JSON.stringify({
            orientation: image.info.orientation,
          });
        }

        if (reqInfo.urlInfo.query.download !== undefined) {
          // use filename as the friendly download name, otherwise path
          const fileOrPath = image.info.filename || image.info.path;
          let friendlyName = path.basename(fileOrPath);
          if (image.info.format) {
            // only use this formatting if an image since we can detect format
            const oldExt = path.extname(fileOrPath);
            const newExt =
              '.' + (image.info.format === 'jpeg' ? 'jpg' : image.info.format);
            friendlyName = path.basename(fileOrPath, oldExt) + newExt;
          }
          headers['Content-Disposition'] =
            'attachment; filename="' + friendlyName + '"';
        }

        if (req.method === 'HEAD') {
          safeWriteHead(204, headers);

          res.end();
        } else {
          safeWriteHead(200, headers);

          res.end(results.gzipAsset || image.buffer);
        }
      };

      getPrefetcher(); // begin the request flow
    };
  }
}
