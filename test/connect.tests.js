'use strict';

var path = require('path');
var chai = require('chai');
var expect = chai.expect;
var Connect = require('../lib/http/connect');

var filesPath = path.resolve(__dirname, './files');

describe('#Image Server Security', function () {

  var connect, connectOptions;

  before(function () {
    connectOptions = {
      stepTimeout: 1000,
      storage: {
        driver: 'fs',
        path: filesPath
      }
    };

    connect = new Connect(connectOptions);
  });

  after(function () {

  });

  it('Default options.stepTimeout', function () {
    connect = new Connect(); // default
    expect(connect.options.stepTimeout).to.equal(60000);
  });

});

