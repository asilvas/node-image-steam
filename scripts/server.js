var http = require('http');
var Connect = require('../lib/http').Connect;

http.createServer(new Connect()).listen(13337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:13337/');

//require('./launch-demo-in-browser');
