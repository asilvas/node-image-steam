module.exports = function(context, stepInfo) {
  var qLvl = (stepInfo.quality && parseInt(stepInfo.quality))
    || 80;
  context.sharp.quality(qLvl);
};
