var path = require('path');

module.exports = {
  storage: {
    defaults: {
      driver: 'fs',
      path: path.resolve(__dirname, './files'),
    },
    cache: {
      path: path.resolve(__dirname, '../test/cache'),
    },
    cacheOptimized: {
      path: path.resolve(__dirname, '../test/cacheOptimized'),
    },
    cacheTTS: 600,
    cacheOptimizedTTS: 300,
    replicas: {
      otherPlace: {
        cache: {
          path: path.resolve(__dirname, '../test/replica-cache'),
        },
        cacheOptimized: {
          path: path.resolve(__dirname, '../test/replica-cacheOptimized'),
        },
      },
    },
  },
  router: {
    beforeProcess: function (routeInfo, options) {
      if (!routeInfo.urlInfo.pathname) {
        return;
      }

      const gisRegex = /gis(\=([w,h,s])([0-9]{1,4})){0,1}/;
      const match = gisRegex.exec(routeInfo.urlInfo.pathname);

      if (match) {
        let replacement;
        if (match[3] && match[3] !== '0') {
          replacement = `rs${options.cmdValDelimiter}`;
          switch (match[2]) {
            case 's':
              replacement += `w${options.paramValDelimiter}${match[3]}${options.paramKeyDelimiter}h${options.paramValDelimiter}${match[3]}`;
              break;
            case 'w':
              replacement += `w${options.paramValDelimiter}${match[3]}`;
              break;
            case 'h':
              replacement += `h${options.paramValDelimiter}${match[3]}`;
              break;
            default:
              throw new Error(
                'Unsupported param ' +
                  match[1] +
                  ' while parsing google image service command ' +
                  match[0]
              );
          }
        } else {
          // when /:/gis=s0, /:/gis, we need to drop gis from the path.
          replacement = ``;
        }
        routeInfo.urlInfo.pathname = routeInfo.urlInfo.pathname.replace(
          match[0],
          replacement
        );
      }
    },
    steps: {
      fm: {
        name: 'format',
        f: 'format',
      },
    },
  },
};
