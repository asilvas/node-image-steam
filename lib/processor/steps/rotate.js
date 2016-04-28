module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  var w = img.info.width;
  var h = img.info.height;

  if (stepInfo.degrees === 'auto') {
    if (!img.info.orientation) return; // nothing more to do

    // http://www.impulseadventure.com/photo/exif-orientation.html
    switch (img.info.orientation) {
      case 2: // UpMirrored
        context.sharp.flop(); // x
        break;
      case 3: // Down
        stepInfo.degrees = '180';
        break;
      case 4: // DownMirrored
        stepInfo.degrees = '180';
        context.sharp.flop(); // x
        break;
      case 5: // LeftMirrored
        context.sharp.flip(); // y
        stepInfo.degrees = '270';
        break;
      case 6: // Left
        stepInfo.degrees = '90';
        break;
      case 7: // RightMirrored
        context.sharp.flip(); // y
        stepInfo.degrees = '90';
        break;
      case 8: // Right
        stepInfo.degrees = '270';
        break;
      default:
        return; // invalid or unsupported
    }

    // remove orientation now that it's been auto-corrected
    // to avoid downloaded asset from being rotated again
    delete img.info.orientation;
  }

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
