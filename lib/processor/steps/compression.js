module.exports = function(context, stepInfo) {
  var cLvl = (stepInfo.compression && parseInt(stepInfo.compression))
    || 6;
  context.sharp.compressionLevel(cLvl);
};
