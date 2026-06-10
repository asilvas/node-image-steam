import { spawn } from 'node:child_process';
import path from 'node:path';

export default async (bench: any) => {
  bench.log('Spawning server process...');

  // spawn server on another process to avoid thread constraint with screen updates under heavy load
  const serverProcess = spawn(
    process.execPath,
    [path.resolve(import.meta.dirname, './server-process.ts')],
    {
      env: {
        ...process.env,
        PORT: String(bench.argv.port),
      },
      detached: false,
      windowsHide: true,
    }
  );

  return new Promise<() => void>((resolve) => {
    // dumb auto-resolve for now to permit server to do its prep before listening
    setTimeout(
      () =>
        resolve(() => {
          serverProcess.kill();
        }),
      2000
    );
  });
};
