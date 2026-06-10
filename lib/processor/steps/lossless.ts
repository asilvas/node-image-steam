export default function lossless(context: any, stepInfo: any) {
  if (stepInfo.near === 'true') {
    // one or the other
    context.formatOptions.nearLossless = true;
  } else {
    context.formatOptions.lossless = true;
  }
}
