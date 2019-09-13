const http = require('http');
const https = require('https');



module.exports = (url, { rejectNon200 = true } = {}) => {

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = (/^https\:/.test(url) ? https : http).request(url, {
      
    }, res => {
      const ttfb = Date.now() - start;
      const { statusCode, headers } = res;

      if (rejectNon200 && statusCode >= 300) return void reject(new Error(`Unexpected status of ${statusCode} returned`));

      const size = parseInt(headers['content-length']) || 0;

      res.resume();

      resolve({ ttfb, size });
    });

    req.on('error', reject);

    req.end();
  });

}
