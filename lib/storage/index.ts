import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import _ from 'lodash';
import Image from '../image.ts';
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

  getDriverInfo(
    originalPath: string,
    req: any,
    { hash, hashFromOptimizedOriginal, options, useFallback = false }: any
  ) {
    const defaults = this.options.defaults || {};
    let opts = defaults;
    let realPath = originalPath;

    const firstPart = this.options.app && originalPath.split('/')[0];

    if (req.headers && req.headers['x-track-origin-referer']) {
      opts['x-track-origin-referer'] = req.headers['x-track-origin-referer'];
    }

    let prefix = '';

    if (options) {
      // use explicit options if provided
      opts = _.merge({}, defaults, options);
    } else if (
      !!hash &&
      this.options.cacheOptimized &&
      hash === hashFromOptimizedOriginal
    ) {
      // use cacheOptimized if enabled
      opts = _.merge({}, defaults, this.options.cacheOptimized);
    } else if (!!hash && this.options.cache) {
      // use cache if enabled
      opts = _.merge({}, defaults, this.options.cache);
    } else if (this.options.app && firstPart in this.options.app) {
      // if app match, use custom options
      prefix = firstPart;
      opts = _.merge({}, defaults, this.options.app[firstPart]);
      realPath = originalPath.substr(firstPart.length + 1);
    } else if (this.options.domain && req.headers.host in opts.domain) {
      // if domain match, use custom options
      prefix = req.headers.host;
      opts = _.merge({}, defaults, this.options.domain[prefix]);
    } else if (
      this.options.header &&
      req.headers['x-isteam-app'] in opts.header
    ) {
      // if `x-isteam-app` header match, use custom options
      prefix = req.headers['x-isteam-app'];
      opts = _.merge({}, defaults, opts.header[prefix]);
    }

    if (opts.fallback && useFallback) {
      // use fallback instead if available & requested
      if (opts.fallback in this.options.app) {
        opts = _.merge({}, defaults, this.options.app[opts.fallback]);
      } else {
        throw new Error(
          `Fallback of '${opts.fallback}' requested but does not exist`
        );
      }
    }

    return {
      driver: this.getDriver(opts, prefix),
      options: opts,
      realPath: realPath,
    };
  }
}
