var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var http = require('http');
var https = require('https');
var URL = require('url');
var StorageBase = require('../storage-base');

module.exports = StorageHttp;

function StorageHttp(options) {
  StorageBase.apply(this, arguments);
}

var p = (StorageHttp.prototype = new StorageBase());

p.fetch = function (options, originalPath, stepsHash, cb) {
  var pathInfo = this.getPathInfo(originalPath, options);
  if (!pathInfo) {
    return void cb(new Error('Invalid path'));
  }

  var client = this.getClient(options);
  var reqOptions = this.getRequestOptions(pathInfo, options);
  if (stepsHash) reqOptions.path += '/' + stepsHash;

  var bufs = [];

  client
    .request(reqOptions, function (res) {
      if (res.statusCode !== 200) {
        return void cb(
          new Error(
            'storage.http.fetch.error: ' +
              res.statusCode +
              ' for ' +
              pathInfo.bucket +
              '/' +
              pathInfo.imagePath
          )
        );
      }

      res.on('data', function (chunk) {
        bufs.push(chunk);
      });

      res.on('end', function () {
        var info = { path: originalPath };
        var meta = {};
        try {
          meta = JSON.parse(
            res.headers['x-isteam-meta'] ||
              res.headers['x-amz-meta-isteam'] ||
              '{}'
          );
        } catch (ex) {
          // eat it and use defaults
        }
        var info = _.merge(
          { path: encodeURIComponent(originalPath), stepsHash: stepsHash },
          meta // merge in object meta
        );
        cb(null, info, Buffer.concat(bufs));
      });
    })
    .on('error', function (err) {
      cb(err);
    })
    .end();
};

p.store = function () {
  throw new Error(
    'Http Storage driver is read-only. Use cache or other driver for writing'
  );
};

p.getClient = function (options) {
  return this.isSecure(options) ? https : http;
};

p.getPathInfo = function (filePath, options) {
  var firstSlash = filePath.indexOf('/');
  var isBucketInPath = options.bucket === undefined;

  return {
    bucket: isBucketInPath ? filePath.substr(0, firstSlash) : options.bucket,
    imagePath: filePath.substr(isBucketInPath ? firstSlash + 1 : 0),
  };
};

p.isSecure = function (options) {
  return /^https\:/i.test(options.endpoint);
};

p.getRequestOptions = function (pathInfo, options) {
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
};
