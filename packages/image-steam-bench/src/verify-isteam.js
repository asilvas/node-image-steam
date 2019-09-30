const request = require('./util/blind-request');
const files = require('./files');

module.exports = async bench => {
  bench.log('Verifying image-steam can talk to image-steam-bench...');

  let url;
  for (let i = 0; i < files.byIndex.length; i++) {
    url = `${bench.argv.url}/${files.byIndex[i]}`;
    bench.log(`Checking ${url}...`);
    await request(url);  
  }

  bench.log('All checks passed.');
}
