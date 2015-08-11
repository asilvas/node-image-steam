var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Connect = require('./connect');
var argv = require('optimist').argv;
var defaults = require('./start-defaults');

module.exports = start;

function start(options) {
  var config = _.merge({}, defaults, options || {});

  if (typeof argv.isConfig === 'string') {
    config = _.merge(config, require(path.resolve(argv.isConfig)));
  }

  return startServers(config);
}

function startServers(config) {
  var servers;

  if (Array.isArray(config.http) === true) {
    servers = []; // array to support multiple binds
    config.http.forEach(function(httpConfig) {
      servers.push(startServer(config, httpConfig));
    });
  } else {
    servers = startServer(config, config.http);
  }

  return servers;
}

function startServer(config, httpConfig) {
  if (httpConfig.ssl) {
    if (typeof httpConfig.ssl.pfx === 'string') {
      httpConfig.ssl.pfx = fs.readFileSync(httpConfig.ssl.pfx, 'utf8');
    }
    if (typeof httpConfig.ssl.key === 'string') {
      httpConfig.ssl.key = fs.readFileSync(httpConfig.ssl.key, 'utf8');
    }
    if (typeof httpConfig.ssl.cert === 'string') {
      httpConfig.ssl.cert = fs.readFileSync(httpConfig.ssl.cert, 'utf8');
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
      httpConfig.ssl ?
        https.createServer(httpConfig.ssl, processRequest.getHandler())
        :
        http.createServer(processRequest.getHandler())
    ;

  server.isteam = processRequest;

  server.on('error', function(err) {
    console.error('image-steam> http(s) error:', (err.stack || err));
  });

  server.listen(httpConfig.port, httpConfig.host, httpConfig.backlog, function(err) {
    if (!err) {
      console.log('Server running at',
        (httpConfig.ssl) ? 'https://' : 'http://'
        + (httpConfig.host || 'localhost') + ':' + httpConfig.port);
    }
  });

  return server;
}
