import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import files from './files.ts';

const gFiles: Record<string, Buffer> = {};

console.log('Starting server...');

files.byIndex.forEach((fn) => {
  gFiles[fn] = fs.readFileSync(
    path.resolve(import.meta.dirname, '..', 'files', fn)
  );
});

const server = http.createServer(httpHandler);

const port = process.env.PORT || 12124;
server.listen(port, () => {
  console.log(`Listening on ${port}`);
});

function httpHandler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return void res.end();
  }

  const [, isteamb, filename] = req.url.split('/');
  const file = gFiles[filename];
  if (isteamb !== 'isteamb' || !file) {
    res.statusCode = 404;
    return void res.end();
  }

  res.setHeader('Content-Type', 'image/jpeg');

  res.end(file);
}
