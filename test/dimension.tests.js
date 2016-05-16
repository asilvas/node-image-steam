'use strict';

var chai = require('chai');
var expect = chai.expect;
var dimension = require('../lib/helpers/dimension');

describe('#Dimension utilities', function () {
  describe('#getInfo', function () {
    it('should handle fractional percentage values', function () {
      expect(dimension.getInfo('1.5%')).to.deep.equal({
        unit: '%',
        modifier: null,
        value: 1.5
      });
      expect(dimension.getInfo('+2.%')).to.deep.equal({
        unit: '%',
        modifier: '+',
        value: 2
      });
      expect(dimension.getInfo('.25%')).to.deep.equal({
        unit: '%',
        modifier: null,
        value: 0.25
      });
      expect(dimension.getInfo('0.5%')).to.deep.equal({
        unit: '%',
        modifier: null,
        value: 0.5
      });
      expect(dimension.getInfo('-1.5%')).to.deep.equal({
        unit: '%',
        modifier: '-',
        value: 1.5
      });
    });

    it('should support only integer pixel values', function () {
      expect(dimension.getInfo('1.5px')).to.deep.equal({
        unit: 'px',
        modifier: null,
        value: 1
      });
      expect(dimension.getInfo('0.5')).to.deep.equal({
        unit: 'px',
        modifier: null,
        value: 0
      });
    });
  });

  describe('#resolveStep', function () {
    it('should correctly convert percentage top/left/width/height values to pixels', function () {
      var originalImage = {
        info: {
          width: 2000,
          height: 1000
        }
      };
      var imageStep = {
        top: '10.5%',
        left: '50%',
        width: '22.5%',
        height: '0.5%'
      };
      dimension.resolveStep(originalImage, imageStep);
      expect(imageStep).to.deep.equal({
        top: 105,
        left: 1000,
        width: 450,
        height: 5
      });
    });
  });
});
