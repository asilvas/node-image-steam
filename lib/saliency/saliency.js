var url = require('url');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var helpers = require('../helpers');
var defaults = require('./saliency-defaults');

let cv, maps, autoFocus;
const Models = {}; // cache

module.exports = Saliency;

function Saliency(options) {
  if (!(this instanceof Saliency)) {
    return new Saliency(options);
  }

  EventEmitter.call(this);

  this.options = _.merge({}, defaults, options || {});
  if (this.options.enabled) {
    cv = require('opencv4nodejs');
    maps = require('salient-maps');
    autoFocus = require('salient-autofocus');
  }
}

var p = Saliency.prototype = new EventEmitter();

p.getModelInstance = function(options) {
  const o = Object.assign({}, this.options.options, options);
  const modelId = options.model || this.options.model;
  let Model = Models[modelId];
  if (!Model) {
    const loader = maps[modelId];
    if (!loader) throw new Error(`Salient model '${modelId}' not found`);
    Model = loader.load();
  }
  return new Model(o);
};

p.getSaliencyMeta = function(image, options, cb) {
  this.getSaliencyMap(image, options, (err, saliencyMap) => {
    if (err) return void cb(err);

    const meta = autoFocus.getMetaFromSalientMatrix(saliencyMap.getDataAsArray());

    cb(null, meta);
  });
};

p.getSaliencyRegion = function(meta, options) {
  if (!cv) throw new Error('saliency not enabled');

  return autoFocus.getRegionFromMeta(meta, options);
};

p.getSaliencyMapAsImage = function(image, options, cb) {
  this.getSaliencyMap(image, options, (err, saliencyMap) => {
    if (err) return void cb(err);

    const { maxVal } = saliencyMap.minMaxLoc();
    cv.imencodeAsync('.jpg', saliencyMap.mul(255 / maxVal)).then(jpg => {
      cb(null, jpg);
    }).catch(cb);
  });
};

p.getSaliencyMap = function(image, options, cb) {
  if (!cv) return void cb(new Error('saliency not enabled'));

  cv.imdecodeAsync(image.buffer).then((mat => {
    const model = this.getModelInstance(options);
    const saliencyMap = model.computeSaliency(mat);
    cb(null, saliencyMap);
  })).catch(cb);
};
