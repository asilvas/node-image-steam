module.exports = function(context, stepInfo) {
  switch (stepInfo.degrees) {
    case '90':
      stepInfo.degrees = 90;
      break;
    case '180':
      stepInfo.degrees = 180;
      break;
    case '270':
      stepInfo.degrees = 270;
      break;
    default:
      return; // do nothing
  }

  context.sharp.rotate(stepInfo.degrees);
};
