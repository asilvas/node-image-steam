export default function stop(servers: any): void {
  if (Array.isArray(servers) === true) {
    servers.forEach(function (server) {
      server.close();
    });
  } else {
    servers.close();
  }
}
