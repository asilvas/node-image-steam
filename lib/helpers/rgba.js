module.exports = {
  getRgba: getRgba
};

function getRgba(imageStep) {
  var rgba = {
    r: 0,
    g: 0,
    b: 0,
    alpha: 1
  };

  if (imageStep.red) {
    rgba.r = parseInt(imageStep.red);
  }

  if (imageStep.green) {
    rgba.g = parseInt(imageStep.green);
  }

  if (imageStep.blue) {
    rgba.b = parseInt(imageStep.blue);
  }

  if (imageStep.alpha) {
    rgba.a = parseFloat(imageStep.alpha);
  }

  if (imageStep.hex) {
    var hex = parseInt(imageStep.hex, 16);
    rgba.r = hex >> 16;
    rgba.g = (hex >> 8) & 255;
    rgba.b = hex & 255;
  }

  return rgba;
}
