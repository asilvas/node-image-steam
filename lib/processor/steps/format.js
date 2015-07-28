var permittedFormats = { 'jpeg': true, 'png': true, 'webp': true };

module.exports = function(context, stepInfo) {
  var fmt = (stepInfo.format in permittedFormats) ? stepInfo.format : 'jpeg';
  if (cmt === 'webp' && /^win/.test(process.platform)) {
    // webp currently unsupported on windows
    fmt = 'jpeg';
  }

  context.sharp
    .toFormat(fmt)
  ;
};
