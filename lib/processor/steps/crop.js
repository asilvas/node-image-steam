var helpers = require('../../helpers');

module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  helpers.dimension.resolveStep(img, stepInfo);

  console.log('cropping to:', stepInfo, 'from', img.info);

  if (isNaN(stepInfo.top)) {
    stepInfo.top = 0;
  }

  if (isNaN(stepInfo.left)) {
    stepInfo.left = 0;
  }

  if (isNaN(stepInfo.width)) {
    stepInfo.width = img.info.width - stepInfo.left;
  }

  if (isNaN(stepInfo.height)) {
    stepInfo.height = img.info.height - stepInfo.top;
  }

  var anchorX = stepInfo.anchor && stepInfo.anchor.length === 2 && stepInfo.anchor[1];
  var anchorY = stepInfo.anchor && stepInfo.anchor.length === 2 && stepInfo.anchor[0];

  switch (anchorY) {
    case 't': // top
      // do nothing
      break;
    case 'b':
      stepInfo.top = img.info.height - stepInfo.height - stepInfo.top;
      break;
    default: // center
      stepInfo.top = Math.round((img.info.height - stepInfo.height - stepInfo.top) / 2);
      break;
  }

  switch (anchorX) {
    case 'l': // left
      // do nothing
      break;
    case 'c': // center
      break;
    case 'r':
      stepInfo.left = img.info.width - stepInfo.width - stepInfo.left;
      break;
    default: // center
      stepInfo.left = Math.round((img.info.width - stepInfo.width - stepInfo.left) / 2);
      break;
  }

  if ((stepInfo.left + stepInfo.width) > img.info.width) {
    // cap width
    stepInfo.width = img.info.width - stepInfo.left;
  }

  if ((stepInfo.top + stepInfo.height) > img.info.height) {
    // cap height
    stepInfo.height = img.info.height - stepInfo.top;
  }

  context.sharp
    .extract(stepInfo.top, stepInfo.left, stepInfo.width, stepInfo.height)
  ;

  // track new dimensions for followup operations
  img.info.width = stepInfo.width;
  img.info.height = stepInfo.height;
};
