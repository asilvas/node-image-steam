var path = require('path');

module.exports = {
  http: [{
    port: 13337
  }],
  log: {
    warnings: true
  },
  processor: {
    sharp: {
      cache: false,
      concurrency: 0,
      simd: true,
      defaults: { animated: true }
    }
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
    defaults: {
      driver: 'fs',
      path: path.resolve(__dirname, '../test/files')
    },
    cache: {
      path: path.resolve(__dirname, '../test/cache')
    },
    cacheOptimized: {
      path: path.resolve(__dirname, '../test/cacheOptimized')
    },
    cacheTTS: 600,
    cacheOptimizedTTS: 300,
    app: {
      proxy: {
        driver: 'http',
        isteamEndpoint: true,
        endpoint: 'http://localhost:13337'
      },
      isteamb: {
        driver: 'isteamb'
      },
      failApp: {
        driver: 'http',
        endpoint: 'https://badhost123123',
        fallback: 'fallbackApp'
      },
      fallbackApp: {
        driver: 'fs',
        path: path.resolve(__dirname, '../test/files')
      },
      A: {
        driver: 'fs',
        path: path.resolve(__dirname, '../test/files'),
        maxSize: { width: 51200, height: 5120 },
        router: {
          originalSteps: {
            resize: { width: '5120', height: '5120' }
          },
        }
      },
      B: {
        driver: 'fs',
        path: path.resolve(__dirname, '../test/files'),
        maxSize: { width: 5120, height: 51200 },
      },
    },
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
  security: {
    enabled : false
  }
};
