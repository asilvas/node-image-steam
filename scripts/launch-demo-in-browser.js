'use strict';

start();

function start() {
  //only run this on windows/mac
  if (require('os').platform() === 'linux') return;

  var open = require('open');

  console.log("Opening coverage report in browser.\n");
  open('http://localhost:13337/UP_steam_loco.jpg/:/rs=w:640/cr=l:50,t:50,w:-100,h:-100?cache=false');
}
