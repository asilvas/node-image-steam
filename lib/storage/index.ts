import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import _ from 'lodash';
import Image from '../image.ts';
import MemCache from './mem-cache.ts';
import StorageBase from './storage-base.ts';
import StorageFs from './fs/index.ts';
import StorageHttp from './http/index.ts';
import StorageImageSteamBench from './isteamb/index.ts';

const require = createRequire(import.meta.url);

const builtinDrivers: Record<string, any> = {
  fs: StorageFs,
  http: StorageHttp,
  isteamb: StorageImageSteamBench,
};

export default class Storage extends EventEmitter {
  static Base = StorageBase;

  options: any;
  artifactReplicas: any[];
  optimizedReplicas: any[];
  drivers: Record<string, any>;
  memCache: MemCache | null;
  #mergedOptsCache = new Map<string, any>();
  #explicitOptsCache = new WeakMap<any, any>();

  constructor(options?: any) {
    super();

    this.options = options || {};

    this.artifactReplicas = [];
    this.optimizedReplicas = [];
    if (this.options.replicas) {
      Object.keys(this.options.replicas).forEach((key) => {
        const replica = this.options.replicas[key];
        if (!replica) return;
        if (replica.replicateArtifacts !== false && replica.cache) {
          this.artifactReplicas.push(replica.cache);
        }
        const cache = replica.cacheOptimized || replica.cache;
        if (cache) {
          this.optimizedReplicas.push(cache);
        }
      });
    }

    // drivers will be initialized on-demand due to the light weight nature of design
    this.drivers = {};

    // opt-in in-memory cache of processed artifacts
    this.memCache = this.options.memCache
      ? new MemCache(this.options.memCache)
      : null;
  }

  getDriver(options: any, prefix?: string) {
    const name = options.driverPath
      ? `${prefix}:byPath/${options.driverPath}`
      : `${prefix}:byName/${options.driver}`;
    let driver = this.drivers[name];

    function createDriver(opts: any) {
      if (opts.driverPath) {
        const mod = require(opts.driverPath);
        const DriverClass = mod?.default ?? mod;
        return new DriverClass(opts);
      } else if (opts.driver) {
        const DriverClass = builtinDrivers[opts.driver];
        if (!DriverClass) {
          throw new Error(`Unknown storage driver: ${opts.driver}`);
        }
        return new DriverClass(opts);
      } else {
        throw new Error('No driver provided');
      }
    }

    if (!driver) {
      // if not found, create it
      driver = createDriver(options);
      driver.name = name;

      // store by name
      this.drivers[driver.name] = driver;
    }

    return driver;
  }

  fetch(req: any, reqOptions: any, fetchOptions: any, cb: any): void {
    cb = _.once(cb); // account for flaky error handling within storage clients to avoid internal failures

    const { originalPath, hashFromOptimizedOriginal, urlInfo } = reqOptions;
    const { hash, useFallback = false } = fetchOptions;

    // serve hot artifacts straight from memory when enabled
    const memKey = this.memCache && hash && `${originalPath}|${hash}`;
    if (memKey) {
      const memImage = this.memCache!.get(memKey);
      if (memImage) {
        return void cb(null, memImage);
      }
    }

    const $this = this;
    let driverInfo: any;
    try {
      driverInfo = this.getDriverInfo(originalPath, req, {
        hash,
        hashFromOptimizedOriginal,
        useFallback,
      });
    } catch (ex) {
      this.emit('warn', ex);
      return void cb(ex);
    }

    // forward on to storage driver in case it supports isteam origin
    const useOriginal = urlInfo.query.useOriginal === 'true';

    driverInfo.driver.fetch(
      { useOriginal, ...driverInfo.options },
      driverInfo.realPath,
      hash,
      function (err: any, img: any, imgData: any) {
        if (err) {
          $this.emit('warn', err);

          if (
            !useFallback &&
            err.statusCode !== 404 &&
            driverInfo.options.fallback
          ) {
            // if no explicit 404 and fallback desired, lets attempt
            // another fetch but using the fallback provider
            return void $this.fetch(
              req,
              reqOptions,
              { ...fetchOptions, useFallback: true },
              cb
            );
          }

          return void cb(err);
        }

        // backward compatible
        if (!(img instanceof Image)) {
          if (img && img.author) delete img.author;
          img = new Image(img, imgData);
        }

        if (memKey) {
          $this.memCache!.set(memKey, img);
        }

        cb(null, img);
      }
    );
  }

  store(
    req: any,
    { originalPath, hashFromOptimizedOriginal }: any,
    { hash, touch, replica, options }: any,
    image: any,
    cb?: any
  ): void {
    cb = cb && _.once(cb); // account for flaky error handling within storage clients to avoid internal failures

    let driverInfo: any;
    try {
      driverInfo = this.getDriverInfo(originalPath, req, {
        hash,
        hashFromOptimizedOriginal,
        options,
      });
    } catch (ex) {
      this.emit('warn', ex);
      return cb && cb(ex);
    }
    image.info.lastModified = new Date(); // auto-tracking of lastModified in meta unless storage client overrides

    if (this.memCache && hash && !touch && !replica) {
      // freshly processed artifacts are the hottest -- cache immediately
      this.memCache.set(`${originalPath}|${hash}`, image);
    }

    driverInfo.driver[touch ? 'touch' : 'store'](
      driverInfo.options,
      driverInfo.realPath,
      hash,
      image,
      (err: any) => {
        if (err) {
          this.emit('warn', err);
          return cb && cb(err);
        }

        cb && cb();
      }
    );

    if (!touch && !replica) {
      // do not process replication for touches and recursion
      if (hash !== hashFromOptimizedOriginal) {
        this.artifactReplicas.forEach((replica) =>
          this.store(
            req,
            { originalPath, hashFromOptimizedOriginal },
            { hash, replica: true, options: replica },
            image
          )
        );
      } else {
        this.optimizedReplicas.forEach((replica) =>
          this.store(
            req,
            { originalPath, hashFromOptimizedOriginal },
            { hash, replica: true, options: replica },
            image
          )
        );
      }
    }
  }

  deleteCache(req: any, { originalPath, useOptimized }: any, cb: any): void {
    cb = _.once(cb); // account for flaky error handling within storage clients to avoid internal failures

    if (this.memCache) {
      // coarse but correct -- cache deletes are rare
      this.memCache.clear();
    }

    const $this = this;
    let driverInfo: any;
    try {
      driverInfo = this.getDriverInfo(originalPath, req, {
        hash: 'cache',
        hashFromOptimizedOriginal: useOptimized ? 'cache' : null,
      });
    } catch (ex) {
      this.emit('warn', ex);
      return void cb(ex);
    }
    if (!driverInfo.driver.deleteCache) {
      const err = new Error(
        `deleteCache not supported on storage driver ${driverInfo.driver.name}`
      );
      this.emit('warn', err);
      return void cb(err);
    }
    driverInfo.driver.deleteCache(
      driverInfo.options,
      driverInfo.realPath,
      function (err: any) {
        if (err) {
          $this.emit('warn', err);
          return void cb(err);
        }

        if (!useOptimized && $this.options.cacheOptimized) {
          // if optimized originals have their own cache, delete there as well
          return void $this.deleteCache(
            req,
            { originalPath, useOptimized: true },
            cb
          );
        }

        cb();
      }
    );
  }

  // all merge inputs are static config -- memoize the expensive deep merges
  // and hand out shallow copies so per-request mutations cannot leak
  #mergedOpts(key: string, source: any) {
    let merged = this.#mergedOptsCache.get(key);
    if (!merged) {
      merged = _.merge({}, this.options.defaults || {}, source);
      this.#mergedOptsCache.set(key, merged);
    }
    return { ...merged };
  }

  getDriverInfo(
    originalPath: string,
    req: any,
    { hash, hashFromOptimizedOriginal, options, useFallback = false }: any
  ) {
    const defaults = this.options.defaults || {};
    let opts = defaults;
    let realPath = originalPath;

    const firstPart = this.options.app && originalPath.split('/')[0];

    let prefix = '';

    if (options) {
      // use explicit options if provided
      if (typeof options === 'object') {
        let merged = this.#explicitOptsCache.get(options);
        if (!merged) {
          merged = _.merge({}, defaults, options);
          this.#explicitOptsCache.set(options, merged);
        }
        opts = { ...merged };
      } else {
        opts = _.merge({}, defaults, options);
      }
    } else if (
      !!hash &&
      this.options.cacheOptimized &&
      hash === hashFromOptimizedOriginal
    ) {
      // use cacheOptimized if enabled
      opts = this.#mergedOpts('cacheOptimized', this.options.cacheOptimized);
    } else if (!!hash && this.options.cache) {
      // use cache if enabled
      opts = this.#mergedOpts('cache', this.options.cache);
    } else if (this.options.app && firstPart in this.options.app) {
      // if app match, use custom options
      prefix = firstPart;
      opts = this.#mergedOpts(`app:${firstPart}`, this.options.app[firstPart]);
      realPath = originalPath.substr(firstPart.length + 1);
    } else if (this.options.domain && req.headers.host in defaults.domain) {
      // if domain match, use custom options
      prefix = req.headers.host;
      opts = this.#mergedOpts(`domain:${prefix}`, this.options.domain[prefix]);
    } else if (
      this.options.header &&
      req.headers['x-isteam-app'] in defaults.header
    ) {
      // if `x-isteam-app` header match, use custom options
      prefix = req.headers['x-isteam-app'];
      opts = this.#mergedOpts(`header:${prefix}`, defaults.header[prefix]);
    }

    if (opts.fallback && useFallback) {
      // use fallback instead if available & requested
      if (opts.fallback in this.options.app) {
        opts = this.#mergedOpts(
          `app:${opts.fallback}`,
          this.options.app[opts.fallback]
        );
      } else {
        throw new Error(
          `Fallback of '${opts.fallback}' requested but does not exist`
        );
      }
    }

    if (req.headers && req.headers['x-track-origin-referer']) {
      // per-request value; opts handed out above are copies so this cannot
      // leak across requests (previously it leaked into shared defaults)
      if (opts === defaults) opts = { ...defaults };
      opts['x-track-origin-referer'] = req.headers['x-track-origin-referer'];
    }

    return {
      driver: this.getDriver(opts, prefix),
      options: opts,
      realPath: realPath,
    };
  }
}
