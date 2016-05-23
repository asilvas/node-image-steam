module.exports = function(context, stepInfo) {
  var img = context.processedImage;
  var w = img.info.width;
  var h = img.info.height;
  var degrees = parseInt(stepInfo.degrees) || 0; // account for 'auto'

  if (img.info.orientation) {
    // http://www.impulseadventure.com/photo/exif-orientation.html
    switch (img.info.orientation) {
      case 2: // UpMirrored
        context.sharp.flop(); // x
        degrees = 360 - degrees; // invert
        break;
      case 3: // Down
        degrees = (degrees + 180) % 360;
        break;
      case 4: // DownMirrored
        context.sharp.flop(); // x
        degrees = (degrees + 180) % 360;
        degrees = 360 - degrees; // invert
        break;
      case 5: // LeftMirrored
        context.sharp.flip(); // y
        degrees = (degrees + 270) % 360;
        if (degrees === 180) degrees = 0;
        else if (degrees === 0) degrees = 180;
        break;
      case 6: // Left
        degrees = (degrees + 90) % 360;
        break;
      case 7: // RightMirrored
        context.sharp.flip(); // y
        degrees = (degrees + 90) % 360;
        if (degrees === 180) degrees = 0;
        else if (degrees === 0) degrees = 180;
        break;
      case 8: // Right
        degrees = (degrees + 270) % 360;
        break;
      // otherwise do nothing
    }

    // remove orientation now that it's been auto-corrected
    // to avoid downloaded asset from being rotated again
    delete img.info.orientation;
  }

  switch (degrees) {
    case 90:
      stepInfo.degrees = 90;
      // invert dimensions
      img.info.width = h;
      img.info.height = w;
      break;
    case 180:
      stepInfo.degrees = 180;
      break;
    case 270:
      stepInfo.degrees = 270;
      // invert dimensions
      img.info.width = h;
      img.info.height = w;
      break;
    default: // 0 or invalid
      return; // do nothing
  }

  context.sharp.rotate(stepInfo.degrees);
};
