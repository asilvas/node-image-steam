var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Connect = require('./connect');
var argv = require('optimist').argv;
var defaults = require('./start-defaults');

module.exports = start;

function start() {
  var config = _.merge({}, defaults);

  if (typeof argv.isConfig === 'string') {
    config = _.merge(config, require(path.resolve(argv.isConfig)));
  }

  if (config.http.ssl) {
    if (typeof config.http.ssl.pfx === 'string') {
      config.http.ssl.pfx = fs.readFileSync(config.http.ssl.pfx, 'utf8');
    }
    if (typeof config.http.ssl.key === 'string') {
      config.http.ssl.key = fs.readFileSync(config.http.ssl.key, 'utf8');
    }
    if (typeof config.http.ssl.cert === 'string') {
      config.http.ssl.cert = fs.readFileSync(config.http.ssl.cert, 'utf8');
    }
  }

  var processRequest = new Connect(config);
  processRequest.on('error', function(err) {
    if (config.log.errors) {
      console.error(new Date().toISOString());
      console.error(err.stack || err);
    }
  });

  var server =
    config.http.ssl ?
      https.createServer(config.ssl, processRequest.getHandler())
      :
      http.createServer(processRequest.getHandler())
  ;

  server.on('error', function(err) {
    console.error('image-steam> http(s) error:', (err.stack || err));
  });

  server.listen(config.http.port, config.http.host, config.http.backlog, function(err) {
    if (!err) {
      console.log('Server running at',
        (config.http.ssl) ? 'https://' : 'http://'
        + config.http.host + ':' + config.http.port);
    }
  });
}
