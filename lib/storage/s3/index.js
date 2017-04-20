var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var knox = require('knox');
var StorageBase = require('../storage-base');
var defaults = require('./s3-defaults');

module.exports = StorageS3;

function StorageS3(options) {
  StorageBase.apply(this, arguments);

  this.options = _.merge({}, defaults, this.options);
}

var p = StorageS3.prototype = new StorageBase();

p.fetch = function(options, originalPath, stepsHash, cb) {
  var pathInfo = getPathInfo(originalPath, options);
  if (!pathInfo) {
    return void cb(new Error('Invalid S3 path'));
  }

  var imagePath = stepsHash
    ? 'isteam/' + pathInfo.imagePath + '/' + stepsHash
    : pathInfo.imagePath
  ;

  var client;
  try {
    client = this.getClient(pathInfo.bucket, options);
  } catch (ex) {
    return void cb(ex);
  }

  var bufs = [];
  client.getFile(imagePath, function(err, res) {
    if (err) {
      return void cb(err);
    }
    var info = _.merge(
      { path: encodeURIComponent(originalPath), stepsHash: stepsHash },
      getMetaFromHeaders(res.headers)
    );

    res.on('data', function(chunk) {
      bufs.push(chunk);
    });

    res.on('end', function() {
      if (res.statusCode !== 200) {
        return void cb(new Error('storage.s3.fetch.error: '
          + res.statusCode + ' for ' + (pathInfo.bucket + '/' + imagePath))
        );
      }

      cb(null, info, Buffer.concat(bufs));
    });
  });
};

p.store = function(options, originalPath, stepsHash, image, cb) {
  var pathInfo = getPathInfo(originalPath, options);
  if (!pathInfo) {
    return void cb(new Error('Invalid S3 path'));
  }

  if (!stepsHash) {
    return void cb(new Error('Cannot store an image over the original'));
  }

  var imagePath = 'isteam/' + pathInfo.imagePath + '/' + stepsHash;

  image.info.stepsHash = stepsHash;

  var client;
  try {
    client = this.getClient(pathInfo.bucket, options);
  } catch (ex) {
    return void cb(ex);
  }

  var headers = _.merge({
      'Content-Type': image.contentType || 'application/octet-stream' // default to binary if unknown
    },
    getHeadersFromMeta(image.info)
  );

  client.putBuffer(image.buffer, imagePath, headers, function (err, res) {
    if (err) {
      return void cb(err);
    }

    if (res.statusCode !== 200) {
      res.setEncoding('utf8');
      res.on('data', function(data) {
        console.error(data);
      });
      return void cb(new Error('storage.s3.store.error: '
          + res.statusCode + ' for ' + (pathInfo.bucket + '/' + imagePath))
      );
    }

    cb();
  });
};

p.getClient = function(bucket, opts) {
  /*
    limitation of knox is one bucket per client... not a huge overhead,
    but may switch s3 interface in future to avoid having to need one
    client for every request... isteam has its own throttling so that
    will help.
   */

  return knox.createClient({
    endpoint: opts.endpoint,
    port: opts.port,
    secure: opts.secure,
    style: opts.style,
    key: opts.accessKey,
    secret: opts.secretKey,
    bucket: bucket
  });
};

function getPathInfo(filePath, options) {
  var firstSlash = filePath.indexOf('/');
  var isBucketInPath = !options.bucket;
  if (firstSlash < 0 && isBucketInPath) {
    return null;
  }

  return {
    bucket: isBucketInPath ? filePath.substr(0, firstSlash) : options.bucket,
    imagePath: filePath.substr(isBucketInPath ? firstSlash + 1 : 0)
  };
}

function getMetaFromHeaders(headers) {
  var info = {};

  var header = headers['x-amz-meta-isteam'];
  if (header) {
    info = JSON.parse(header);
  }

  return info;
}

function getHeadersFromMeta(info) {
  var headers = {
    'x-amz-meta-isteam': JSON.stringify(info)
  };

  return headers;
}
