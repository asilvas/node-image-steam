var path = require('path');

module.exports = {
  storage: {
    defaults: {
      driver: 'fs',
      path: path.resolve(__dirname, './files')
    },
    cache: {
      path: path.resolve(__dirname, '../test/cache')
    },
    cacheOptimized: {
      path: path.resolve(__dirname, '../test/cacheOptimized')
    },
    cacheTTS: 600,
    cacheOptimizedTTS: 300,
    replicas: {
      otherPlace: {
        cache: {
          path: path.resolve(__dirname, '../test/replica-cache')
        },
        cacheOptimized: {
          path: path.resolve(__dirname, '../test/replica-cacheOptimized')
        }
      }
    }
  },
  router: {
    steps: {
      fm: {
        name: 'format',
        f: 'format'
      }
    }
  }
};
