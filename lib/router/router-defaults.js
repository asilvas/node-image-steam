module.exports = {
  pathDelimiter: '/:/',
  signatureDelimiter: '/-/',
  cmdKeyDelimiter: '/',
  cmdValDelimiter: '=',
  paramKeyDelimiter: ',',
  paramValDelimiter: ':',
  supportWebP: true,
  supportAVIF: false, // disabled by default due to very expensive encoder
  originalSteps: {
    resize: { width: '2560', height: '2560', max: 'true', canGrow: 'false' },
    quality: { quality: '95' },
    metadata: { enabled: 'true' },
    format: { format: 'webp' }
  },
  hqOriginalMaxPixels: 400 * 400, // < 300KB lossless compression
  hqOriginalSteps: {
    lossless: { near: 'true' },
    metadata: { enabled: 'true' },
    format: { format: 'webp' }
  },
  commands: {
    $colors: {
      name: 'colors',
      w: 'width',
      h: 'height',
      mc: 'maxColors',
      cc: 'cubicCells',
      mn: 'mean',
      o: 'order'
    },
    $info: {
      name: 'info'
    },
    $saliency: {
      name: 'saliency'
    },
    $saliencyMap: {
      name: 'saliencyMap',
      w: 'width',
      h: 'height',
      m: 'model',
      af: 'autoFocus'
    }
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
      int: 'interpolator',
      bg: 'background',
      ft: 'fit',
      ps: 'position'
    },
    exd: {
      name: 'extend',
      t: 'top',
      b: 'bottom',
      l: 'left',
      r: 'right',
      bg: 'background'
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
    gm: {
      name: 'gamma',
      g: 'gamma'
    },
    ll: {
      name: 'lossless',
      n: 'near'
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
