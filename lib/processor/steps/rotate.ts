export default function rotate(context: any, stepInfo: any) {
  const img = context.processedImage;
  const w = img.info.width;
  const h = img.info.height;
  let degrees = parseInt(stepInfo.degrees) || 0; // account for 'auto'

  if (img.info.orientation) {
    // https://sirv.com/help/articles/rotate-photos-to-be-upright
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
        degrees = (degrees + 90) % 360;
        if (degrees === 180) degrees = 0;
        else if (degrees === 0) degrees = 180;
        break;
      case 6: // Left
        degrees = (degrees + 90) % 360;
        break;
      case 7: // RightMirrored
        context.sharp.flip(); // y
        degrees = (degrees + 270) % 360;
        if (degrees === 180) degrees = 0;
        else if (degrees === 0) degrees = 180;
        break;
      case 8: // Right
        degrees = (degrees + 270) % 360;
        break;
      // otherwise do nothing
    }

    // orientation is baked into the pixels from this point on (including
    // when the net rotation is 0deg), so the EXIF Orientation tag must not
    // survive into the output or EXIF-honoring browsers (e.g. Safari with
    // WebP) will rotate the image a second time
    context.orientationCorrected = true;
    if (context.metadataRequested) {
      // metadata step already ran; override the retained Orientation tag
      context.sharp.withMetadata({ orientation: 1 });
    }
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
    default:
      // 0 or invalid
      return; // do nothing
  }

  context.sharp.rotate(stepInfo.degrees);
}
