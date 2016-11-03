module.exports = {
  pathDelimiter: '/:/',
  signatureDelimiter: '/-/',
  cmdKeyDelimiter: '/',
  cmdValDelimiter: '=',
  paramKeyDelimiter: ',',
  paramValDelimiter: ':',
  originalSteps: {
    resize: { width: '2560', height: '1440', max: 'true', canGrow: 'false' },
    quality: { quality: '95' },
    metadata: { enabled: 'true' },
    format: { format: 'webp' }
  },
  steps: {
    rs: {
      name: 'resize',
      w: 'width',
      h: 'height',
      l: 'left',
      t: 'top',
      m: 'min',
      mx: 'max',
      cg: 'canGrow',
      i: 'ignoreAspect',
      int: 'interpolator'
    },
    cr: {
      name: 'crop',
      t: 'top',
      l: 'left',
      w: 'width',
      h: 'height',
      a: 'anchor',
      ax: 'anchorX',
      ay: 'anchorY'
    },
    fm: {
      name: 'format',
      f: 'format'
    },
    qt: {
      name: 'quality',
      q: 'quality'
    },
    cp: {
      name: 'compression',
      c: 'compression'
    },
    pg: {
      name: 'progressive'
    },
    rt: {
      name: 'rotate',
      d: 'degrees'
    },
    fl: {
      name: 'flip',
      x: 'x',
      y: 'y'
    },
    md: {
      name: 'metadata',
      e: 'enabled'
    },
    ft: {
      name: 'flatten'
    },
    ip: {
      name: 'interpolation',
      i: 'interpolator'
    },
    eb: {
      name: 'embed'
    },
    gm: {
      name: 'gamma',
      g: 'gamma'
    },
    bg: {
      name: 'background',
      r: 'red',
      g: 'green',
      b: 'blue',
      a: 'alpha',
      h: 'hex'
    },
    'fx-gs': {
      name: 'greyscale'
    },
    'fx-sp': {
      name: 'sharpen',
      r: 'radius',
      f: 'flat',
      j: 'jagged'
    },
    'fx-nm': {
      name: 'normalize'
    },
    'fx-bl': {
      name: 'blur',
      s: 'sigma'
    }
  }
};
