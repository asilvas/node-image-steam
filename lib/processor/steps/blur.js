module.exports = function(context, stepInfo) {
  stepInfo.sigma = parseFloat(stepInfo.sigma);
  if (stepInfo.sigma < 0.3) {
    stepInfo.sigma = 0.3;
  } else if (stepInfo.sigma > 1000) {
    stepInfo.sigma = 1000;
  }

  context.sharp.blur(stepInfo.sigma);
};
