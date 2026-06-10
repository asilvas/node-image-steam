export default function metadata(context: any, stepInfo: any) {
  if (stepInfo.enabled !== 'true') {
    return;
  }

  // defaults to pulling over meta data

  context.sharp.withMetadata();
}
