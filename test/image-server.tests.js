'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var fs = require('fs');
var path = require('path');
var isteam = require('../');
var serverOptions = require('./image-server.config.js');
var serverRequests = require('./image-server.requests.js');
var etags = require('./image-server.etags.json');

describe('#Image Server', function () {
  var server;

  describe('#Server Pipeline', function () {

  });

  describe('#Image Steps', function () {

    before(function (cb) {
      server = isteam.http.start(serverOptions);
      cb();
    });

    after(function (cb) {
      fs.writeFileSync(path.join(__dirname, './image-server.etags.json'),
        JSON.stringify(etags, null, '\t'), 'utf8'
      );

      isteam.http.stop(server);
      cb();
    });

    serverRequests.forEach(function (serverRequest) {
      serverRequest.url = getUrlFromImageSteps(serverRequest);
      it(serverRequest.label + ', url: ' + serverRequest.url, function (cb) {
        getResponse(serverRequest.url, function (err, res) {
          expect(res.statusCode).to.be.equal(200);
          var requestEtag = etags[serverRequest.url] || 'undefined';
          etags[serverRequest.url] = res.headers.etag;
          expect(res.headers.etag).to.be.equal(requestEtag);
          if (serverRequest.contentType) {
            expect(res.headers['content-type']).to.be.equal(serverRequest.contentType);
          }
          cb();
        });
      });
    });

  });


});

function getUrlFromImageSteps(serverRequest) {
  var steps = serverRequest.steps;
  var imgName = serverRequest.imageName || 'UP_steam_loco.jpg';
  var fmt = (serverRequest.imageName || /fm\=f\:/.test(steps)) ? '' : '/fm=f:jpeg';
  if (steps.length === 0) {
    fmt = fmt.substr(1);
  }
  return 'http://localhost:13337/' + imgName + '/:/' + steps + fmt + '?cache=false';
}

function getResponse(url, cb) {
  http.get(url, function (res) {
    cb(null, res);
  }).on('error', function (err) {
    cb(err);
  });
}
