module.exports = function(context, stepInfo) {
  var rgba = {
    r: 0,
    g: 0,
    b: 0,
    a: 1
  };

  if (stepInfo.red) {
    rgba.r = parseInt(stepInfo.red);
  }

  if (stepInfo.green) {
    rgba.g = parseInt(stepInfo.green);
  }

  if (stepInfo.blue) {
    rgba.b = parseInt(stepInfo.blue);
  }

  if (stepInfo.alpha) {
    rgba.a = parseFloat(stepInfo.alpha);
  }

  if (stepInfo.hex) {
    var hex = parseInt(stepInfo.hex, 16);
    rgba.r = hex >> 16;
    rgba.g = hex >> 8 & 255;
    rgba.b = hex & 255;
  }

  context.sharp.background(rgba);
  //context.sharp.background('rgba(' + rgba.r + ', ' + rgba.g + ', ' + rgba.b + ', ' + rgba.a + ')');
};
