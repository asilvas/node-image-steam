import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import HttpAgent from 'agentkeepalive';
import Connect from './connect.ts';
import defaults from './start-defaults.ts';

const { HttpsAgent } = HttpAgent;
const require = createRequire(import.meta.url);

const argv: any = yargs(hideBin(process.argv)).parse();

// sync-loads a .ts or .js config module in both Node and Bun
function loadConfig(configPath: string) {
  const mod = require(path.resolve(configPath));
  return mod?.default ?? mod;
}

export default function start(options?: any) {
  let config = _.merge({}, defaults, options || {});

  if (typeof argv.isDefaults === 'string') {
    config = _.merge(config, loadConfig(argv.isDefaults));
  }

  if (typeof argv.isConfig === 'string') {
    config = _.merge(config, loadConfig(argv.isConfig));
  }

  process.on('SIGINT', function () {
    // force exit, to prevent open handles from keeping the process open
    setTimeout(process.exit, 1000).unref(); // do not let timeout keep process open
  });

  return startServers(config);
}

function startServers(config: any) {
  let servers;

  if (Array.isArray(config.http) === true) {
    servers = []; // array to support multiple binds
    config.http.forEach(function (httpConfig: any) {
      servers.push(startServer(config, httpConfig));
    });
  } else {
    servers = startServer(config, config.http);
  }

  return servers;
}

function startServer(config: any, httpConfig: any) {
  if (typeof httpConfig.globalAgent !== 'undefined') {
    (http as any).globalAgent = _.isPlainObject(httpConfig.globalAgent)
      ? new HttpAgent(httpConfig.globalAgent)
      : httpConfig.globalAgent;
    (https as any).globalAgent = _.isPlainObject(httpConfig.globalAgent)
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

  const processRequest = new Connect(config);
  processRequest.on('error', function (err: any) {
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
  processRequest.on('warn', function (err: any) {
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

  const server: any = httpConfig.ssl
    ? https.createServer(httpConfig.ssl, processRequest.getHandler())
    : http.createServer(processRequest.getHandler());
  server.isteam = processRequest;

  server.on('error', function (err: any) {
    console.error('image-steam> http(s) error:', err.stack || err);
  });

  server.listen(
    httpConfig.port,
    httpConfig.host,
    httpConfig.backlog,
    function (err?: any) {
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
