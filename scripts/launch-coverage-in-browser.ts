import os from 'node:os';
import path from 'node:path';
import open from 'open';

console.log("If you just ran unit tests, you don't have proper coverage.");

start();

function start() {
  // only run this on windows/mac
  if (os.platform() === 'linux') return outputError();

  let page = path
    .resolve(import.meta.dirname, '../coverage/lcov-report/index.html')
    .replace(/\\/g, '/');
  page = 'file:///' + page;
  page = page.replace('file:////', 'file:///');

  console.log('Opening coverage report in browser.\n');
  open(page);
  setTimeout(outputError, 500);
}

function outputError() {
  console.error("If you just ran tests, you don't have full coverage...");
  process.exit(666); // be evil, will break build
}
