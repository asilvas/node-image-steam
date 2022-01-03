'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var fs = require('fs');
var path = require('path');
var isteam = require('../');
var serverOptions = require('./image-server.config.js');
var serverRequests = require('./image-server.requests.js');
var etags = require('./image-server.etags.json').reduce(function (state, o) {
  state[o.url] = o.etag;
  return state;
}, {});

describe('#Image Server', function () {
  var server;

  describe('#Server Pipeline', function () {});

  describe('#Image Steps', function () {
    before(function (cb) {
      server = isteam.http.start(serverOptions);
      cb();
    });

    after(function (cb) {
      var sortedUrls = Object.keys(etags)
        .map(function (k) {
          return { url: k, etag: etags[k] };
        })
        .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0)); // ordered
      fs.writeFileSync(
        path.join(__dirname, './image-server.etags.json'),
        JSON.stringify(sortedUrls, null, '\t'),
        'utf8'
      );

      isteam.http.stop(server);
      cb();
    });

    serverRequests.forEach(function (serverRequest) {
      serverRequest.options = serverRequest.options || {};
      serverRequest.reqOptions = getReqFromImageSteps(serverRequest);
      it(`${
        serverRequest.label
      }, request: ${serverRequest.reqOptions.method || 'GET'} ${serverRequest.reqOptions.url.replace('fm=f:raw', 'fm=f:png')}`, function (cb) {
        getResponse(serverRequest.reqOptions, function (err, res) {
          expect(res.statusCode).to.be.equal(
            serverRequest.options.statusCode || 200
          );
          const etagKey = `${
            serverRequest.options.method
              ? serverRequest.options.method + ' '
              : ''
          }${serverRequest.reqOptions.url}`;
          const isNew = !(etagKey in etags);
          const requestEtag = etags[etagKey] || 'undefined';
          etags[etagKey] = res.headers.etag;
          if (!isNew) {
            // don't validate etag if it's a new test
            expect(res.headers.etag || 'undefined').to.be.equal(requestEtag);
          }
          if (serverRequest.contentType) {
            expect(res.headers['content-type']).to.be.equal(
              serverRequest.contentType
            );
          }
          cb();
        });
      });
    });
  });
});

function getReqFromImageSteps(serverRequest) {
  const steps = serverRequest.steps;
  const options = serverRequest.options || {};
  const imgName = serverRequest.imageName || 'UP_steam_loco.jpg';
  let fmt = serverRequest.imageName || /fm\=f\:/.test(steps) ? '' : '/fm=f:raw';
  if (options.disableFormat) fmt = '';
  if (steps.length === 0 && fmt) {
    fmt = fmt.substr(1);
  }
  const qs = serverRequest.qs || {};
  if (qs.cache === undefined) qs.cache = 'false';
  const qsArray = Object.keys(qs).map((k) => `${k}=${qs[k]}`);
  const queryString = qsArray.length === 0 ? '' : `?${qsArray.join('&')}`;

  const reqOptions = {
    protocol: 'http:',
    host: 'localhost',
    port: 13337,
    method: options.method || 'GET',
    headers: options.headers || {},
    path: `/${imgName}/:/${steps}${fmt}${queryString}`,
    agent: false, // no pooling
  };
  reqOptions.url = `${reqOptions.protocol}//${reqOptions.host}:${reqOptions.port}${reqOptions.path}`;

  return reqOptions;
}

function getResponse(reqOptions, cb) {
  http
    .request(reqOptions, (res) => {
      cb(null, res);
      res.resume(); // free the response
    })
    .on('error', (err) => {
      cb(err);
    })
    .end();
}
