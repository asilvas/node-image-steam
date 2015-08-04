var path = require('path');

module.exports = Storage;

function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  options = options
    || { driver: 'fs', path: path.resolve(__dirname, '../../test/files') }
  ;

  this.driver = new (require('./' + options.driver || 'fs'))(options);
}

var p = Storage.prototype;

p.fetch = function() {
  this.driver.fetch.apply(this.driver, arguments);
};

p.store = function() {
  this.driver.store.apply(this.driver, arguments);
};
