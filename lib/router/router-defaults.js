module.exports = {
  pathDelimiter: '/:/',
  cmdKeyDelimiter: '/',
  cmdValDelimiter: '=',
  paramKeyDelimiter: ',',
  paramValDelimiter: ':',
  originalSteps: {
    resize: { width: '2560', height: '1440', max: 'true', canGrow: 'false' },
    quality: { quality: '90' },
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
      i: 'ignoreAspect'
    },
    cr: {
      name: 'crop',
      t: 'top',
      l: 'left',
      w: 'width',
      h: 'height',
      a: 'anchor'
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
    'fx-gs': {
      name: 'greyscale'
    },
    'fx-bl': {
      name: 'blur',
      s: 'sigma'
    }
  }
};
