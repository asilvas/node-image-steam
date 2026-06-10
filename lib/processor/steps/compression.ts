export default function compression(context: any, stepInfo: any) {
  context.formatOptions.compressionLevel =
    (stepInfo.compression && parseInt(stepInfo.compression)) || 6;
}
