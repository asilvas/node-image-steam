const http = require('http');
const fs = require('fs');
const path = require('path');
const files = require('./files');

const gFiles = {};

console.log('Starting server...');

files.byIndex.forEach(fn => {
  gFiles[fn] = fs.readFileSync(path.resolve(__dirname, '..', 'files', fn));
});

const server = http.createServer(httpHandler);

const port = process.env.PORT || 12124;
server.listen(port, err => {
  if (err) {
    return void console.error(err.stack);
  }

  console.log(`Listening on ${port}`);
})

function httpHandler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return void res.end();
  }

  const [,isteamb, filename] = req.url.split('/');
  const file = gFiles[filename];
  if (isteamb !== 'isteamb' || !file) {
    res.statusCode = 404;
    return void res.end();
  }

  res.setHeader('Content-Type', 'image/jpeg');

  res.end(file);
}
