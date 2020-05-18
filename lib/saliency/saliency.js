const url = require('url');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const helpers = require('../helpers');
const defaults = require('./saliency-defaults');

const Models = {}; // cache

module.exports = Saliency;

function Saliency(options) {
  if (!(this instanceof Saliency)) {
    return new Saliency(options);
  }

  EventEmitter.call(this);

  this.options = _.merge({}, defaults, options || {});
  if (this.options.enabled) {
    this.cv = require('opencv4nodejs');
    this.maps = require('salient-maps');
    this.autoFocus = require('salient-autofocus');
  }
}

var p = Saliency.prototype = new EventEmitter();

p.getModelInstance = function(options) {
  const o = Object.assign({}, this.options.options, options);
  const modelId = options.model || this.options.model;
  let Model = Models[modelId];
  if (!Model) {
    const loader = this.maps[modelId];
    if (!loader) throw new Error(`Salient model '${modelId}' not found`);
    Model = loader.load();
  }
  return new Model(o);
};

p.getSaliencyMeta = function(image, options, cb) {
  this.getSaliencyMap(image, options, (err, saliencyMap) => {
    if (err) return void cb(err);

    const meta = this.autoFocus.getMetaFromSalientMatrix(saliencyMap.getDataAsArray());

    cb(null, meta);
  });
};

p.getSaliencyRegion = function(meta, options) {
  if (!this.cv) throw new Error('saliency not enabled');

  return this.autoFocus.getRegionFromMeta(meta, options);
};

p.getSaliencyMapAsImage = function(image, options, cb) {
  this.getSaliencyMap(image, options, (err, saliencyMap) => {
    if (err) return void cb(err);

    let finalImage = saliencyMap.convertTo(this.cv.CV_8UC3, 255);

    const meta = image.info.saliency;
    if (options.autoFocus && meta) {
      finalImage = finalImage.cvtColor(cv.COLOR_GRAY2BGR);
      meta.r25th && finalImage.drawRectangle(new this.cv.Rect(meta.r25th.l * finalImage.cols, meta.r25th.t * finalImage.rows, meta.r25th.w * finalImage.cols, meta.r25th.h * finalImage.rows), new cv.Vec(100, 100, 255));
      meta.r40th && finalImage.drawRectangle(new this.cv.Rect(meta.r40th.l * finalImage.cols, meta.r40th.t * finalImage.rows, meta.r40th.w * finalImage.cols, meta.r40th.h * finalImage.rows), new cv.Vec(150, 150, 255));
      meta.r50th && finalImage.drawRectangle(new this.cv.Rect(meta.r50th.l * finalImage.cols, meta.r50th.t * finalImage.rows, meta.r50th.w * finalImage.cols, meta.r50th.h * finalImage.rows), new cv.Vec(0, 0, 255));
      meta.r75th && finalImage.drawRectangle(new this.cv.Rect(meta.r75th.l * finalImage.cols, meta.r75th.t * finalImage.rows, meta.r75th.w * finalImage.cols, meta.r75th.h * finalImage.rows), new cv.Vec(0, 255, 255));
      meta.r90th && finalImage.drawRectangle(new this.cv.Rect(meta.r90th.l * finalImage.cols, meta.r90th.t * finalImage.rows, meta.r90th.w * finalImage.cols, meta.r90th.h * finalImage.rows), new cv.Vec(0, 255, 0));
    }

    this.cv.imencodeAsync('.jpg', finalImage).then(jpg => {
      cb(null, jpg);
    }).catch(cb);
  });
};

p.getSaliencyMap = function(image, options, cb) {
  if (!this.cv) return void cb(new Error('saliency not enabled'));

  this.cv.imdecodeAsync(image.buffer).then((mat => {
    const model = this.getModelInstance(options);
    const saliencyMap = model.computeSaliency(mat);
    cb(null, saliencyMap);
  })).catch(cb);
};
