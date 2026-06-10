const permittedFormats: Record<string, boolean> = {
  jpeg: true,
  png: true,
  webp: true,
  raw: true,
  avif: true,
  gif: true,
};

export default function format(context: any, stepInfo: any) {
  const fmt = stepInfo.format in permittedFormats ? stepInfo.format : 'jpeg';

  context.processedImage.info.format = fmt;

  context.sharp.toFormat(fmt, context.formatOptions);
}
