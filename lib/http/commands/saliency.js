module.exports = function (command, image, reqInfo, req, res, cb) {
  if (!image.info.saliency) {
    const err = new Error('Saliency not available');
    this.saliency.emit('error', err);
    return void cb && cb(err);
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      saliency: image.info.saliency,
    })
  );

  cb && cb();
};
