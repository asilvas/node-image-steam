import os from 'node:os';
import open from 'open';

// only run this on windows/mac
if (os.platform() !== 'linux') {
  console.log('Opening demo in browser.\n');
  open(
    'http://localhost:13337/UP_steam_loco.jpg/:/rs=w:640/cr=l:50,t:50,w:-100,h:-100?cache=false'
  );
}
