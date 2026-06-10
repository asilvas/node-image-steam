import path from 'node:path';
import { expect } from 'chai';
import Connect from '../lib/http/connect.ts';

const filesPath = path.resolve(import.meta.dirname, './files');

describe('#Connect', function () {
  let connect: any, connectOptions: any;

  before(function () {
    connectOptions = {
      stepTimeout: 1000,
      storage: {
        driver: 'fs',
        path: filesPath,
      },
    };

    connect = new Connect(connectOptions);
  });

  after(function () {});

  it('Default options.stepTimeout', function () {
    connect = new Connect(); // default
    expect(connect.options.stepTimeout).to.equal(60000);
  });
});
