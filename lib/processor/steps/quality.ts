export default function quality(context: any, stepInfo: any) {
  context.formatOptions.quality =
    (stepInfo.quality && parseInt(stepInfo.quality)) || 80;
}
