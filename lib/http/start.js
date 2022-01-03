const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Connect = require('./connect');
const argv = require('yargs').argv;
const defaults = require('./start-defaults');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = HttpAgent.HttpsAgent;

module.exports = start;

function start(options) {
  var config = _.merge({}, defaults, options || {});

  if (typeof argv.isDefaults === 'string') {
    config = _.merge(config, require(path.resolve(argv.isDefaults)));
  }

  if (typeof argv.isConfig === 'string') {
    config = _.merge(config, require(path.resolve(argv.isConfig)));
  }

  process.on('SIGINT', function () {
    // force exit, to prevent open handles from keeping the process open
    setTimeout(process.exit, 1000).unref(); // do not let timeout keep process open
  });

  return startServers(config);
}

function startServers(config) {
  var servers;

  if (Array.isArray(config.http) === true) {
    servers = []; // array to support multiple binds
    config.http.forEach(function (httpConfig) {
      servers.push(startServer(config, httpConfig));
    });
  } else {
    servers = startServer(config, config.http);
  }

  return servers;
}

function startServer(config, httpConfig) {
  if (typeof httpConfig.globalAgent !== 'undefined') {
    http.globalAgent = _.isPlainObject(httpConfig.globalAgent)
      ? new HttpAgent(httpConfig.globalAgent)
      : httpConfig.globalAgent;
    https.globalAgent = _.isPlainObject(httpConfig.globalAgent)
      ? new HttpsAgent(httpConfig.globalAgent)
      : httpConfig.globalAgent;
  }

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
  processRequest.on('error', function (err) {
    if (config.log.errors) {
      console.error(
        'ERR:',
        new Date().toISOString(),
        err.method || '',
        err.url || ''
      );
      console.error(err.stack || err);
    }
  });
  processRequest.on('warn', function (err) {
    if (config.log.warnings) {
      console.warn(
        'WARN:',
        new Date().toISOString(),
        err.method || '',
        err.url || ''
      );
      console.warn(err.stack || err);
    }
  });

  var server = httpConfig.ssl
    ? https.createServer(httpConfig.ssl, processRequest.getHandler())
    : http.createServer(processRequest.getHandler());
  server.isteam = processRequest;

  server.on('error', function (err) {
    console.error('image-steam> http(s) error:', err.stack || err);
  });

  server.listen(
    httpConfig.port,
    httpConfig.host,
    httpConfig.backlog,
    function (err) {
      if (!err) {
        console.log(
          'Server running at',
          httpConfig.ssl
            ? 'https://'
            : 'http://' +
                (httpConfig.host || 'localhost') +
                ':' +
                httpConfig.port
        );
      }
    }
  );

  return server;
}
