var helpers = require('../../helpers');
var _ = require('lodash');

module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  helpers.dimension.resolveStep(img, stepInfo);
  var anchorX = isNaN(stepInfo.anchorX) ? Math.floor(img.info.width / 2) : stepInfo.anchorX,
      anchorY = isNaN(stepInfo.anchorY) ? Math.floor(img.info.height / 2) : stepInfo.anchorY;

  if (stepInfo.width < 1 || stepInfo.height < 1) {
    // don't permit <= 0 inputs
    throw new Error('crop width or height cannot be <= 0');
  }

  if (isNaN(stepInfo.width)) {
    stepInfo.width = img.info.width - (stepInfo.left || 0);
  }

  if (isNaN(stepInfo.height)) {
    stepInfo.height = img.info.height - (stepInfo.top || 0);
  }

  if (isNaN(stepInfo.top)) {
    stepInfo.top = Math.round(anchorY - stepInfo.height / 2);
  }

  if (isNaN(stepInfo.left)) {
    stepInfo.left = Math.round(anchorX - stepInfo.width / 2);
  }

  if (stepInfo.left < 0) {
    stepInfo.left = 0;
  }
  if ((stepInfo.left + stepInfo.width) > img.info.width) {
    stepInfo.left = Math.max(0, img.info.width - stepInfo.width);
  }
  if ((stepInfo.left + stepInfo.width) > img.info.width) {
    // cap width
    stepInfo.width = img.info.width - stepInfo.left;
  }

  if (stepInfo.top < 0) {
    stepInfo.top = 0;
  }
  if ((stepInfo.top + stepInfo.height) > img.info.height) {
    stepInfo.top = Math.max(0, img.info.height - stepInfo.height);
  }
  if ((stepInfo.top + stepInfo.height) > img.info.height) {
    // cap height
    stepInfo.height = img.info.height - stepInfo.top;
  }

  context.sharp.extract(_.pick(stepInfo, ['top', 'left', 'width', 'height']));

  // track new dimensions for followup operations
  img.info.width = stepInfo.width;
  img.info.height = stepInfo.height;
};
