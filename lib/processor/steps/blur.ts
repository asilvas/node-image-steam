export default function blur(context: any, stepInfo: any) {
  stepInfo.sigma = parseFloat(stepInfo.sigma) || 2.0;
  if (stepInfo.sigma < 0.3) {
    stepInfo.sigma = 0.3;
  } else if (stepInfo.sigma > 1000) {
    stepInfo.sigma = 1000;
  }

  context.sharp.blur(stepInfo.sigma);
}
