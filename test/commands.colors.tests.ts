import path from 'node:path';
import fs from 'node:fs';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import colors from '../lib/http/commands/colors.ts';

chai.use(sinonChai);

const filesPath = path.resolve(import.meta.dirname, './files');
const steamEngineBuffer = fs.readFileSync(
  path.resolve(filesPath, 'steam-engine.jpg')
);

describe('#Commands.colors', function () {
  let command: any, image: any, reqInfo: any, req: any, res: any;

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
    colors(command, image, reqInfo, req, res, (err, c) => {
      expect(err).to.be.equal(null);
      expect(res.end).to.have.been.calledWithExactly(
        JSON.stringify({ colors: c })
      );
      cb();
    });
  });

  it('Fail if no srcBuffer', function (cb) {
    image.buffer = null;
    try {
      colors(command, image, reqInfo, req, res, () => {
        cb(new Error('Should not get this far'));
      });
    } catch (ex: any) {
      expect(ex.message).to.be.equal(
        'options.srcPath or options.srcBuffer is required'
      );
      cb();
    }
  });
});
