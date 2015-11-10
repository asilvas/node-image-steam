module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  var w = img.info.width;
  var h = img.info.height;

  switch (stepInfo.degrees) {
    case '90':
      stepInfo.degrees = 90;
      // invert dimensions
      img.info.width = h;
      img.info.height = w;
      break;
    case '180':
      stepInfo.degrees = 180;
      break;
    case '270':
      stepInfo.degrees = 270;
      // invert dimensions
      img.info.width = h;
      img.info.height = w;
      break;
    default:
      return; // do nothing
  }

  context.sharp.rotate(stepInfo.degrees);
};
