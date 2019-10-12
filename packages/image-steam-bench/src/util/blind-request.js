const http = require('http');
const https = require('https');

const agent = new http.Agent({ keepAlive: false, maxSockets: Infinity });

module.exports = (url, { rejectNon200 = true } = {}) => {

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = (/^https\:/.test(url) ? https : http).request(url, {
      agent,
      timeout: 20000
    }, res => {
      const ttfb = Date.now() - start;
      const { statusCode, headers } = res;

      if (rejectNon200 && statusCode >= 300) return void reject(new Error(`Unexpected status of ${statusCode} returned`));

      const size = parseInt(headers['content-length']) || 0;

      res.resume();

      resolve({ ttfb, size });
    });

    req.once('error', reject);
    req.once('timeout', reject);

    req.end();
  });

}
