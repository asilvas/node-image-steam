'use strict';

start();

function start() {
  //only run this on windows/mac
  if (require('os').platform() === 'linux') return;

  var open = require('open');

  console.log("Opening coverage report in browser.\n");
  open('http://localhost:13337/UP_steam_loco.jpg/:/rs=w640/cr=l5%:t10%:w90%:h90%?cache=false');
}
