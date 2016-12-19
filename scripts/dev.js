var path = require('path');

module.exports = {
  http: [{
    port: 13337
  }],
  processor: {
    cache: false,
    concurrency: 0,
    simd: true
  },
  router: {
    steps: {
      fm: {
        name: 'format',
        f: 'format'
      }
    }
  },
  storage: {
    driver: 'fs',
    path: path.resolve(__dirname, '../test/files'),
    cache: {
      path: path.resolve(__dirname, '../test/cache')
    }
  },
  security: {
    enabled : false
  }
};
