module.exports = {
  getRGBA: getRGBA
};

function getRGBA(imageStep) {
  if (!imageStep.background) {
    return null;
  }
  var type = imageStep.background.match(/^.*(?=(\())/)[0];
  var value = imageStep.background.match(/(?<=\().+?(?=\))/)[0];

  var rgba = {
    r: 0,
    g: 0,
    b: 0,
    alpha: 1
  };

  if (type === 'hex') {
    var hex = parseInt(value, 16);
    rgba.r = hex >> 16;
    rgba.g = (hex >> 8) & 255;
    rgba.b = hex & 255;
  }

  if (type === 'rgb' || type === 'rgba') {
    var colors = value.split(';');
    rgba.r = parseInt(colors[0]);
    rgba.g = parseInt(colors[1]);
    rgba.b = parseInt(colors[2]);
    rgba.alpha = colors.length === 4 ? parseInt(colors[3]) : 1;
  }

  return rgba;
}
