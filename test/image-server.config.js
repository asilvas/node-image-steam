var path = require('path');

module.exports = {
  storage: {
    driver: 'fs',
    path: path.resolve(__dirname, './files')
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
