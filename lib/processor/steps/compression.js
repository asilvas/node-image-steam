module.exports = function (context, stepInfo) {
  context.formatOptions.compressionLevel =
    (stepInfo.compression && parseInt(stepInfo.compression)) || 6;
};
