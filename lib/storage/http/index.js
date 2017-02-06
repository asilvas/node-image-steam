var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var http = require('http');
var https = require('https');
var StorageBase = require('../storage-base');

module.exports = StorageHttp;

function StorageHttp(options) {
  StorageBase.apply(this, arguments);
}

var p = StorageHttp.prototype = new StorageBase();

p.fetch = function(options, originalPath, stepsHash, cb) {
  var pathInfo = getPathInfo(originalPath, options);
  if (!pathInfo) {
    return void cb(new Error('Invalid path'));
  }

  var client = /^https\:/.test(options.endpoint) ? https : http;
  var imageUri = getImageUri(pathInfo, options);

  var bufs = [];

  client.get(imageUri, function(res) {
    if (res.statusCode !== 200) {
      return void cb(new Error('storage.http.fetch.error: '
        + res.statusCode + ' for ' + imageUri)
      );
    }

    res.on('data', function(chunk) {
      bufs.push(chunk);
    });

    res.on('end', function() {
      var info = { path: originalPath };
      cb(null, info, Buffer.concat(bufs));
    });
  }).on('error', function(err) {
    cb(err);
  });
};

p.store = function() {
  throw new Error('Http Storage driver is read-only. Use cache or other driver for writing');
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

function getImageUri(pathInfo, options) {
  return options.endpoint + '/' + pathInfo.bucket + '/' + pathInfo.imagePath;
};
