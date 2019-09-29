const { spawn } = require('child_process');
const path = require('path');

module.exports = async bench => {
  bench.log('Spawning server process...');

  // spawn server on another process to avoid thread constraint with screen updates under heavy load
  const serverProcess = spawn('node', [path.resolve(__dirname, './server-process.js')], {
    env: {
      ...process.env,
      PORT: bench.argv.port
    },
    detached: false,
    windowsHide: true
  });

  return new Promise(resolve => {
    // dumb auto-resolve for now to permit server to do its prep before listening
    setTimeout(() => resolve(() => {
      serverProcess.kill();
    }), 2000);
  });
}
