export default function metadata(context: any, stepInfo: any) {
  if (stepInfo.enabled !== 'true') {
    return;
  }

  // defaults to pulling over meta data

  context.metadataRequested = true;

  // if the rotate step has already baked the EXIF orientation into the
  // pixels, reset the outgoing Orientation tag so EXIF-honoring browsers
  // (e.g. Safari with WebP) don't rotate the image a second time
  context.sharp.withMetadata(
    context.orientationCorrected ? { orientation: 1 } : {}
  );
}
