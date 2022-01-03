module.exports = stop;

function stop(servers) {
  if (Array.isArray(servers) === true) {
    servers.forEach(function (server) {
      server.close();
    });
  } else {
    servers.close();
  }
}
