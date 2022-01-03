'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var isteam = require('../');
var Security = require('../lib/security');
var serverOptions = require('./image-server.config.js');
var serverRequests = require('./image-server.requests.js');
var crypto = require('crypto');

describe('#Image Server Security', function () {
  it('Throws an error if options.secret is not defined', function () {
    expect(function () {
      new Security({
        enabled: true,
      });
    }).to.throw(
      Security.SecurityError,
      'You must set a secret to enable Security'
    );
  });

  var server;
  var secret = 'keyboard_cat';

  before(function () {
    serverOptions.security = {
      enabled: true,
      secret: secret,
      algorithm: 'sha256',
    };

    server = isteam.http.start(serverOptions);
  });

  after(function () {
    isteam.http.stop(server);
  });

  serverRequests.forEach(function (serverRequest) {
    var url = getUrlFromImageSteps(serverRequest);
    if (!url) return;
    it(
      serverRequest.label + ', url: ' + url + ' good signature',
      function (url, cb) {
        getResponse(url, function (err, res) {
          expect(res.statusCode).to.be.equal(200);
          if (serverRequest.contentType) {
            expect(res.headers['content-type']).to.be.equal(
              serverRequest.contentType
            );
          }
          cb();
        });
      }.bind({}, url)
    );
  });

  serverRequests.forEach(function (serverRequest) {
    var url = getUrlFromImageSteps(serverRequest, 'bogussig');
    if (!url) return;
    it(
      serverRequest.label + ', url: ' + url + ' bad signature',
      function (url, cb) {
        getResponse(url, function (err, res) {
          expect(res.statusCode).to.be.equal(401);
          cb();
        });
      }.bind({}, url)
    );
  });

  function getUrlFromImageSteps(serverRequest, signature) {
    var options = serverRequest.options || {};
    if (options.security === false) return;
    var steps = serverRequest.steps;
    var imgName = serverRequest.imageName || 'UP_steam_loco.jpg';

    if (!signature) {
      var shasum = crypto.createHash('sha256');
      shasum.update('/' + imgName + '/:/' + steps + secret);
      signature = shasum
        .digest('base64')
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .substring(0, 8);
    }

    return (
      'http://localhost:13337/' +
      imgName +
      '/:/' +
      steps +
      '/-/' +
      signature +
      '?cache=false'
    );
  }

  function getResponse(url, cb) {
    http
      .get(url, function (res) {
        cb(null, res);
        res.resume(); // free the response
      })
      .on('error', function (err) {
        cb(err);
      });
  }
});
