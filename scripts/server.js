var http = require('../').http;

http.start();

process.argv.forEach(function(arg) {
  if (arg === '--isDemo') {
    require('./launch-demo-in-browser.js');
  }
});
