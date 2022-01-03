module.exports = {
  getRGBA: getRGBA,
};

function getRGBA(imageStep) {
  if (!imageStep.background) return null;

  // type(v1[; v2][; v3][; v4])
  var match = /^([^\(].*)\(([^\)].*)\)$/.exec(imageStep.background);
  if (!match || match.length !== 3)
    throw new Error('Invalid `background` value');
  var type = match[1];
  var value = match[2];

  var rgba;

  if (type === 'hex') {
    var hex = parseInt(value, 16);
    rgba = {
      r: hex >> 16,
      g: (hex >> 8) & 255,
      b: hex & 255,
      alpha: 1,
    };
  } else if (type === 'rgb' || type === 'rgba') {
    var rgbaValues = value.split(';').map(parseFloat);

    rgba = {
      r: rgbaValues[0] || 0,
      g: rgbaValues[1] || 0,
      b: rgbaValues[2] || 0,
      alpha: rgbaValues.length === 4 ? rgbaValues[3] : 1,
    };
  } else {
    throw new Error('Invalid `background` value');
  }

  return rgba;
}
