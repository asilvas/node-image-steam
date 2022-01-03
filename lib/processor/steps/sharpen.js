module.exports = function (context, stepInfo) {
  var radius, flat, jagged;

  if (stepInfo.radius) {
    radius = parseFloat(stepInfo.radius);
  }

  if (stepInfo.flat) {
    flat = parseFloat(stepInfo.flat);
  }

  if (stepInfo.jagged) {
    jagged = parseFloat(stepInfo.jagged);
  }

  context.sharp.sharpen(radius, flat, jagged);
};
