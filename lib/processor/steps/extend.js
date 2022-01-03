var helpers = require('../../helpers');

module.exports = function (context, stepInfo) {
  var img = context.processedImage;
  helpers.dimension.resolveStep(img, stepInfo);

  if (isNaN(stepInfo.top)) {
    stepInfo.top = 0;
  } else {
    stepInfo.top = parseInt(stepInfo.top);
  }

  if (isNaN(stepInfo.bottom)) {
    stepInfo.bottom = 0;
  } else {
    stepInfo.bottom = parseInt(stepInfo.bottom);
  }

  if (isNaN(stepInfo.left)) {
    stepInfo.left = 0;
  } else {
    stepInfo.left = parseInt(stepInfo.left);
  }

  if (isNaN(stepInfo.right)) {
    stepInfo.right = 0;
  } else {
    stepInfo.right = parseInt(stepInfo.right);
  }

  var rgba = helpers.rgba.getRGBA(stepInfo);

  context.sharp.extend({
    top: stepInfo.top,
    left: stepInfo.left,
    bottom: stepInfo.bottom,
    right: stepInfo.right,
    background: rgba,
  });
};
