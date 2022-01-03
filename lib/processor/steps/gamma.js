module.exports = function (context, stepInfo) {
  context.sharp.gamma(parseFloat(stepInfo.gamma || '2.2'));
};
