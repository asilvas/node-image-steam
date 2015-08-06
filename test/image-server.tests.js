'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var isteam = require('../');
var serverOptions = require('./image-server.config.js');
var serverRequests = require('./image-server.requests.js');


describe('#Image Server', function () {
  var server;

  before(function (cb) {
    server = isteam.http.start(serverOptions);
    cb();
  });

  after(function (cb) {
    isteam.http.stop(server);
    cb();
  });

  serverRequests.forEach(function (serverRequest) {
    it(serverRequest.label, function (cb) {
      getResponseFromImageSteps(serverRequest.steps, function (err, res) {
        expect(res.statusCode).to.be.equal(200);
        expect(res.headers.etag).to.be.equal(serverRequest.etag);
        if (serverRequest.contentType) {
          expect(res.headers['content-type']).to.be.equal(serverRequest.contentType);
        }
        cb();
      });
    });
  });

});

function getResponseFromImageSteps(steps, cb) {
  var fmt = /fm\=f\:/.test(steps) ? '' : '/fm=f:jpeg';
  if (steps.length === 0) {
    fmt = fmt.substr(1);
  }
  var url = 'http://localhost:13337/UP_steam_loco.jpg/:/' + steps + fmt + '?cache=false';
  http.get(url, function (res) {
    cb(null, res);
  }).on('error', function (err) {
    cb(err);
  });
}
