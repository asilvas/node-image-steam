'use strict';

var chai = require('chai');
var _ = require('lodash');
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

    describe('with anchor position specified', function () {
      var originalImage = {
        info: {
          width: 2000,
          height: 1000
        }
      };

      it('should handle percentage values', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '30%',
          anchorY: '70%'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 600,
          anchorY: 700
        });
      });

      it('should handle pixel values', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '300px',
          anchorY: '500px'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 300,
          anchorY: 500
        });
      });

      it('should handle positive percentage offset values with no anchor specified', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '+10%',
          anchorY: '+20%'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 1200,
          anchorY: 700
        });
      });

      it('should handle positive pixel offset values with no anchor specified', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '+100px',
          anchorY: '+200px'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 1100,
          anchorY: 700
        });
      });

      it('should handle negative percentage offset values with no anchor specified', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '-10%',
          anchorY: '-25%'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 800,
          anchorY: 250
        });
      });

      it('should handle negative pixel offset values with no anchor specified', function () {
        var imageStep = {
          width: '200',
          height: '100',
          anchorX: '-100px',
          anchorY: '-200px'
        };
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 900,
          anchorY: 300
        });
      });

      it('should handle offset values with anchor specified', function () {
        var imageStep, defaults = {
          width: '200',
          height: '100',
          anchorX: '+10%',
          anchorY: '+25%'
        };
        imageStep = _.assign({}, defaults, { anchor: 'bl', anchorY: '-25%' });
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 300,
          anchorY: 700,
          anchor: 'bl'
        });
        imageStep = _.assign({}, defaults, { anchor: 'tr', anchorX: '-10%' });
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 1700,
          anchorY: 300,
          anchor: 'tr'
        });
        imageStep = _.assign({}, defaults, { anchor: 'bc', anchorY: '-25%' });
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 1200,
          anchorY: 700,
          anchor: 'bc'
        });
        imageStep = _.assign({}, defaults, { anchor: 'cr', anchorX: '-400px' });
        dimension.resolveStep(originalImage, imageStep);
        expect(imageStep).to.deep.equal({
          width: 200,
          height: 100,
          anchorX: 1500,
          anchorY: 750,
          anchor: 'cr'
        });
      });
    });
  });
});
