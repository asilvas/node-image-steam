module.exports = function(context, stepInfo) {
  context.sharp.interpolateWith(stepInfo.interpolator || 'bilinear');
};
