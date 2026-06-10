import isteam from '../lib/index.ts';

isteam.http.start();

if (process.argv.includes('--isDemo')) {
  import('./launch-demo-in-browser.ts');
}
