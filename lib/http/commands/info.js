module.exports = function(command, image, reqInfo, req, res, cb) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    info: image.info
  }));

  cb && cb();
};
