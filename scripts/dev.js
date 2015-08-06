var path = require('path');

module.exports = {
  storage: {
    driver: 'fs',
    path: path.resolve(__dirname, '../test/files')
  }
};
