#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const binPath = path.resolve(import.meta.dirname, 'isteam.js');

const proc = spawn(process.execPath, [binPath, ...args], {
  stdio: 'ignore',
  detached: true,
});

proc.on('exit', function (code) {
  console.error('image-steam exited: ' + code);
});

proc.unref(); // unreference so we may exit
