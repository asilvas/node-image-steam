var permittedFormats = { 'jpeg': true, 'png': true, 'webp': true, 'raw': true, 'avif': true };

module.exports = function(context, stepInfo) {
  var fmt = (stepInfo.format in permittedFormats) ? stepInfo.format : 'jpeg';
  if (fmt === 'webp' && /^win/.test(process.platform)) {
    // webp currently unsupported on windows
    fmt = 'jpeg';
  }

  context.processedImage.info.format = fmt;

  context.sharp
    .toFormat(fmt, context.formatOptions)
  ;
};
