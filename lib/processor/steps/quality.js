module.exports = function(context, stepInfo) {
  context.formatOptions.quality = (stepInfo.quality && parseInt(stepInfo.quality))
    || 80;
};
