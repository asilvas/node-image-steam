import http from 'node:http';
import https from 'node:https';
import URL from 'node:url';
import _ from 'lodash';
import StorageBase from '../storage-base.ts';

export default class StorageHttp extends StorageBase {
  fetch(options: any, originalPath: string, stepsHash: string, cb: any): void {
    const pathInfo = this.getPathInfo(originalPath, options);
    if (!pathInfo) {
      return void cb(new Error('Invalid path'));
    }

    const client = this.getClient(options);
    const reqOptions = this.getRequestOptions(pathInfo, options);
    if (stepsHash) reqOptions.path += '/' + stepsHash;

    const bufs: Buffer[] = [];

    client
      .request(reqOptions, function (res: any) {
        if (res.statusCode !== 200) {
          const err: any = new Error(
            'storage.http.fetch.error: ' +
              res.statusCode +
              ' for ' +
              pathInfo.bucket +
              '/' +
              pathInfo.imagePath
          );
          err.statusCode = res.statusCode;
          return void cb(err);
        }

        res.on('data', function (chunk: Buffer) {
          bufs.push(chunk);
        });

        res.on('end', function () {
          let meta = {};
          try {
            meta = JSON.parse(
              res.headers['x-isteam-meta'] ||
                res.headers['x-amz-meta-isteam'] ||
                '{}'
            );
          } catch (ex) {
            // eat it and use defaults
          }
          const info = _.merge(
            { path: encodeURIComponent(originalPath), stepsHash: stepsHash },
            meta // merge in object meta
          );
          cb(null, info, Buffer.concat(bufs));
        });
      })
      .on('error', function (err: any) {
        cb(err);
      })
      .end();
  }

  store(): void {
    throw new Error(
      'Http Storage driver is read-only. Use cache or other driver for writing'
    );
  }

  getClient(options: any) {
    return this.isSecure(options) ? https : http;
  }

  getPathInfo(filePath: string, options: any) {
    const firstSlash = filePath.indexOf('/');
    const isBucketInPath = options.bucket === undefined;

    return {
      bucket: isBucketInPath ? filePath.substr(0, firstSlash) : options.bucket,
      imagePath: filePath.substr(isBucketInPath ? firstSlash + 1 : 0),
    };
  }

  isSecure(options: any): boolean {
    return /^https\:/i.test(options.endpoint);
  }

  getRequestOptions(pathInfo: any, options: any): any {
    const headers = { ...(options.headers || {}) }; // default
    const urlInfo = URL.parse(options.endpoint);

    const trackReferer = options['x-track-origin-referer'];
    if (trackReferer) {
      headers['x-track-origin-referer'] = trackReferer;
    }

    const sep = urlInfo.path[urlInfo.path.length - 1] === '/' ? '' : '/';
    const bucketPath = pathInfo.bucket ? `${pathInfo.bucket}/` : '';
    const postfix = options.isteamEndpoint
      ? options.useOriginal
        ? '?useOriginal=true'
        : '?optimized=true'
      : '';
    return {
      protocol: urlInfo.protocol,
      hostname: urlInfo.hostname,
      port: urlInfo.port
        ? parseInt(urlInfo.port)
        : urlInfo.protocol === 'https:'
        ? 443
        : 80,
      path: `${urlInfo.path}${sep}${bucketPath}${encodeURI(
        pathInfo.imagePath
      )}${postfix}`,
      method: 'GET',
      headers,
    };
  }
}
