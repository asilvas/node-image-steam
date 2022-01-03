'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);
const fs = require('fs');
const lib = require('../lib/http/commands/colors');

const filesPath = path.resolve(__dirname, './files');
const steamEngineBuffer = fs.readFileSync(
  path.resolve(filesPath, 'steam-engine.jpg')
);

describe('#Commands.colors', function () {
  let ret, command, image, reqInfo, req, res;

  beforeEach(function () {
    command = {};
    image = {
      buffer: steamEngineBuffer,
    };
    reqInfo = {};
    req = {};
    res = {
      writeHead: sinon.stub(),
      end: sinon.stub(),
    };
  });

  it('Default settings', function (cb) {
    ret = lib(command, image, reqInfo, req, res, (err, colors) => {
      expect(err).to.be.equal(null);
      expect(res.end).to.have.been.calledWithExactly(
        JSON.stringify({ colors: colors })
      );
      cb();
    });
  });

  it('Fail if no srcBuffer', function (cb) {
    image.buffer = null;
    try {
      ret = lib(command, image, reqInfo, req, res, (err, colors) => {
        cb(new Error('Should not get this far'));
      });
    } catch (ex) {
      expect(ex.message).to.be.equal(
        'options.srcPath or options.srcBuffer is required'
      );
      cb();
    }
  });
});
