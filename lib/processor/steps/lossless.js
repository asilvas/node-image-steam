module.exports = function(context, stepInfo) {
  if (stepInfo.near === 'true') { // one or the other
    context.formatOptions.nearLossless = true;
  } else {
    context.formatOptions.lossless = true;
  }
};
