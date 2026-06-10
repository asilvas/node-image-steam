import path from 'node:path';
import fs from 'fs-extra';
import _ from 'lodash';
import StorageBase from '../storage-base.ts';

// chars that are invalid in Windows filenames (excluding path separators).
// Only applied on win32 so existing *nix cache paths are unaffected.
const INVALID_WIN32_CHARS = /[<>:"|?*\x00-\x1f]/g;

function safeFsPath(originalPath: string): string {
  if (process.platform !== 'win32') return originalPath;

  return originalPath.replace(
    INVALID_WIN32_CHARS,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  );
}

export default class StorageFs extends StorageBase {
  fetch(options: any, originalPath: string, stepsHash: string, cb: any): void {
    const safePath = safeFsPath(originalPath);
    const filename = path.resolve(
      options.path || './',
      stepsHash ? `${safePath}-${stepsHash}` : safePath
    );

    fs.readFile(filename + '.json', 'utf8', function (err: any, data: any) {
      let info: any = { path: originalPath, stepsHash: stepsHash };
      if (data) {
        try {
          info = _.merge(info, JSON.parse(data.toString()));
        } catch (err) {
          return cb(err);
        }
      }

      let error: any, fileStats: any, fileData: any;

      fs.stat(filename, (err: any, stats: any) => {
        if (err) {
          if (error) return; // cb already called

          if (err.code === 'ENOENT') {
            err.statusCode = 404;
          }

          error = err;
          return void cb(err);
        }

        fileStats = stats;
        info.lastModified = stats.mtime;
        if (fileStats && fileData) {
          cb(null, info, fileData);
        }
      });

      fs.readFile(filename, (err: any, data: any) => {
        if (err) {
          if (error) return; // cb already called
          if (err.code === 'ENOENT') err.statusCode = 404;
          error = err;
          return void cb(err);
        }

        fileData = data;
        if (fileStats && fileData) {
          cb(null, info, fileData);
        }
      });
    });
  }

  touch(
    options: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    const filename = path.resolve(
      options.path || './',
      `${safeFsPath(originalPath)}-${stepsHash}`
    );
    const now = new Date();

    // touch
    fs.utimes(filename, now, now, cb);
  }

  store(
    options: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    const filename = path.resolve(
      options.path || './',
      `${safeFsPath(originalPath)}-${stepsHash}`
    );

    image.info.stepsHash = stepsHash;

    checkDir(filename, (err: any) => {
      if (err) {
        return void cb(err);
      }
      fs.writeFile(
        filename + '.json',
        Buffer.from(JSON.stringify(image.info)),
        'utf8',
        function (err: any) {
          // do nothing
        }
      );
      fs.writeFile(filename, image.buffer, cb);
    });
  }

  deleteCache(options: any, originalPath: string, cb: any): void {
    const cachePath = path.resolve(options.path || './');

    fs.remove(cachePath, cb);
  }
}

function checkDir(filename: string, cb: any) {
  const folder = path.dirname(filename);
  fs.stat(folder, (err: any) => {
    if (!err) return cb();
    if (err.code === 'ENOENT') {
      fs.mkdirp(folder, (err: any) => {
        if (err) {
          return void cb(err);
        }
        cb();
      });
    } else {
      return void cb(err);
    }
  });
}
