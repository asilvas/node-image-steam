import { expect } from 'chai';
import http from 'node:http';
import crypto from 'node:crypto';
import isteam from '../lib/index.ts';
import Security from '../lib/security/index.ts';
import serverOptions from './image-server.config.ts';
import serverRequests from './image-server.requests.ts';

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

  let server: any;
  const secret = 'keyboard_cat';

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
    const url = getUrlFromImageSteps(serverRequest);
    if (!url) return;
    it(
      serverRequest.label + ', url: ' + url + ' good signature',
      function (cb) {
        getResponse(url, function (err: any, res: any) {
          expect(res.statusCode).to.be.equal(200);
          if (serverRequest.contentType) {
            expect(res.headers['content-type']).to.be.equal(
              serverRequest.contentType
            );
          }
          cb();
        });
      }
    );
  });

  serverRequests.forEach(function (serverRequest) {
    const url = getUrlFromImageSteps(serverRequest, 'bogussig');
    if (!url) return;
    it(serverRequest.label + ', url: ' + url + ' bad signature', function (cb) {
      getResponse(url, function (err: any, res: any) {
        expect(res.statusCode).to.be.equal(401);
        cb();
      });
    });
  });

  function getUrlFromImageSteps(serverRequest: any, signature?: string) {
    const options = serverRequest.options || {};
    if (options.security === false) return;
    const steps = serverRequest.steps;
    const imgName = serverRequest.imageName || 'UP_steam_loco.jpg';

    if (!signature) {
      const shasum = crypto.createHash('sha256');
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

  function getResponse(url: string, cb: any) {
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
