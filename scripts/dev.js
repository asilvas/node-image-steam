var path = require('path');

module.exports = {
  http: [{
    port: 13337
  }],
  log: {
    warnings: true
  },
  /*saliency: {
    enabled: true,
    version: 1,
    autoCrop: true,
    alwaysOn: true,
    model: 'spectral',
    map: true,
    options: {
      width: 200,
      height: 200
    }
  },*/
  processor: {
    sharp: {
      cache: false,
      concurrency: 0,
      simd: true
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
      }
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
