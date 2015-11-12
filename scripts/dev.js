var path = require('path');

module.exports = {
  http: [{
    port: 13337
  }, {
    port: 13338
  }],
  router: {
    steps: {
/*      fm: {
        name: 'format',
        f: 'format'
      }*/
    }
  },
  storage: {
    driver: 'fs',
    path: path.resolve(__dirname, '../test/files')
  }
};
