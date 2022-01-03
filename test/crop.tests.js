'use strict';

var chai = require('chai');
var expect = chai.expect;
var crop = require('../lib/processor/steps/crop');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

describe('#Crop step', function () {
  it('should correctly convert absolute percentage anchor positioning to pixel offsets', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '70%',
      anchorX: '70%',
      width: 500,
      height: 250,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 450,
      top: 225,
      width: 500,
      height: 250,
    });
  });

  it('should correctly compute crop position when using absolute pixel anchor positioning', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '300',
      anchorX: '750',
      width: 500,
      height: 250,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 500,
      top: 175,
      width: 500,
      height: 250,
    });
  });

  it("should correctly compute crop position when using absolute pixel anchor positioning with 'px'", function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '300px',
      anchorX: '750px',
      width: 500,
      height: 250,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 500,
      top: 175,
      width: 500,
      height: 250,
    });
  });

  it('should prevent negative top/left positioning when using absolute anchor position', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '50',
      anchorX: '50',
      width: 500,
      height: 250,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 0,
      top: 0,
      width: 500,
      height: 250,
    });
  });

  it('should restrict crop region to the image bounds when using large anchor values', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '450',
      anchorX: '900',
      width: 500,
      height: 250,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 500,
      top: 250,
      width: 500,
      height: 250,
    });
  });

  it('should shrink the crop region if it exceeds the image size', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchorY: '450',
      anchorX: '900',
      width: 1100,
      height: 600,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
    });
  });

  it('should correctly handle cropping when specifying an anchor quadrant', function () {
    var context = {
      sharp: {
        extract: sinon.spy(),
      },
      processedImage: {
        info: {
          width: 1000,
          height: 500,
        },
      },
    };
    var stepInfo = {
      anchor: 'br',
      width: 200,
      height: 100,
    };
    crop(context, stepInfo);
    expect(context.sharp.extract).to.have.been.calledWith({
      left: 800,
      top: 400,
      width: 200,
      height: 100,
    });
  });
});
