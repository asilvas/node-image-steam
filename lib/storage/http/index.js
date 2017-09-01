var path = require('path');
var fs = require('fs');
var http2 = require('http2');
var URL = require('url');
var StorageBase = require('../storage-base');

module.exports = StorageHttp;

function StorageHttp(options) {
  StorageBase.apply(this, arguments);
}

var p = StorageHttp.prototype = new StorageBase();

p.fetch = function(options, originalPath, stepsHash, cb) {
  var pathInfo = this.getPathInfo(originalPath, options);
  if (!pathInfo) {
    return void cb(new Error('Invalid path'));
  }

  var client = this.getClient(options);
  var reqOptions = this.getRequestOptions(pathInfo, options);
  if (stepsHash) reqOptions.path += '/' + stepsHash;
  
  const req = client.request(reqOptions);

  const bufs = [];
  req.on('data', function(chunk) {
    bufs.push(chunk);
  });

  req.on('response', headers => {
    if (headers[':status'] !== 200) {
      return void cb(new Error('storage.http.fetch.error: '
        + headers[':status'] + ' for ' + pathInfo.bucket + '/' + pathInfo.imagePath)
      );
    }

    req.on('end', function() {
      let meta = {};
      try {
        meta = JSON.parse(headers['x-isteam-meta'] || '{}');
      } catch (ex) {
        // eat it and use defaults
      }
      const info = Object.assign(
        { path: encodeURIComponent(originalPath), stepsHash: stepsHash },
        meta // merge in object meta
      );
      cb(null, info, Buffer.concat(bufs));
    });
  }).on('error', function(err) {
    cb(err);
  }).end();
};

p.store = function() {
  throw new Error('Http Storage driver is read-only. Use other driver for caching');
};

p.getClient = function({ endpoint }) {
  return http2.connect(endpoint);
};

p.getPathInfo = function(filePath, options) {
  var firstSlash = filePath.indexOf('/');
  var isBucketInPath = !options.bucket;
  if (firstSlash < 0 && isBucketInPath) {
    return null;
  }

  return {
    bucket: isBucketInPath ? filePath.substr(0, firstSlash) : options.bucket,
    imagePath: filePath.substr(isBucketInPath ? firstSlash + 1 : 0)
  };
};

p.isSecure = function(options) { // function retained for backward compatibility
  return /^https\:/.test(options.endpoint);
};

p.getRequestOptions = function(pathInfo, options) {
  const urlInfo = URL.parse(options.endpoint);
  return {
    ':path': urlInfo.path + (urlInfo.path[urlInfo.path.length - 1] === '/' ? '' : '/') + pathInfo.bucket + '/' + encodeURI(pathInfo.imagePath),
    ':method': 'GET'
  };
};
