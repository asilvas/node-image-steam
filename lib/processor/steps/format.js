var permittedFormats = { 'jpeg': true, 'png': true, 'webp': true };

module.exports = function(context, stepInfo) {
  var fmt = (stepInfo.format in permittedFormats) ? stepInfo.format : 'jpeg';

  context.sharp
    .toFormat(fmt)
  ;
};
