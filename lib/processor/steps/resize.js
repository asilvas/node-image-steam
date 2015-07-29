var helpers = require('../../helpers');

module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  helpers.dimension.resolveStep(img, stepInfo);

  if (isNaN(stepInfo.width) && isNaN(stepInfo.height)) {
    throw new Error('resize width or height required');
  }

  var aspectX = helpers.dimension.getXAspect(img);
  var aspectY = helpers.dimension.getYAspect(img);

  if (isNaN(stepInfo.width)) {
    stepInfo.width = Math.round(stepInfo.height * aspectX);
  }

  if (isNaN(stepInfo.height)) {
    stepInfo.height = Math.round(stepInfo.width * aspectY);
  }

  var ignoreAspect = stepInfo.ignoreAspect === 'true';

  if (!ignoreAspect) {
    var w = stepInfo.width, h = stepInfo.height;

    if (stepInfo.min !== undefined) {
      // use min if specified

      // apply aspect
      h = Math.round(stepInfo.width * aspectY);

      if (h < stepInfo.height) {
        // if height less than minimum, set to min
        h = stepInfo.height;
        w = Math.ceil(stepInfo.height * aspectX);
      }

      if (w < stepInfo.width) {
        // if width less than minimum, set to min
        w = stepInfo.width;
        h = Math.ceil(stepInfo.width * aspectY);
      }

    } else {
      // use max otherwise

      // apply aspect
      h = Math.round(w * aspectY);

      if (h > stepInfo.height) {
        // if height more than maximum, reduce to max
        h = stepInfo.height;
        w = Math.floor(h * aspectX);
      }

      if (w > stepInfo.width) {
        // if width more than maximum, reduce to max
        w = stepInfo.width;
        h = Math.floor(w * aspectY);
      }
    }

    stepInfo.width = w;
    stepInfo.height = h;
  }

  if (stepInfo.canGrow !== 'true') {
    if (stepInfo.width > img.info.width) {
      stepInfo.width = img.info.width;
      if (!ignoreAspect) {
        stepInfo.height = Math.ceil(stepInfo.width * aspectY);
      }
    }

    if (stepInfo.height > img.info.height) {
      stepInfo.height = img.info.height;
      if (!ignoreAspect) {
        stepInfo.width = Math.ceil(stepInfo.height * aspectX);
      }
    }
  }

  // track new dimensions for followup operations
  img.info.width = stepInfo.width;
  img.info.height = stepInfo.height;

  context.sharp
    .ignoreAspectRatio() // we'll handle aspect ourselves to avoid having to recompute dimensions
    .resize(stepInfo.width, stepInfo.height)
  ;
};
