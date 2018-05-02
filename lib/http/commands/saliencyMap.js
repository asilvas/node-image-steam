module.exports = function(command, image, reqInfo, req, res, cb) {
  if (!this.saliency.options.map) {
    const err = new Error('$saliencyMap is disabled via `map` option');
    this.saliency.emit('warn', err);
    res.writeHead(404);
    res.end();
    return void cb && cb(err);
  }

  const { width=200, height=200, model='deep' } = command;
  command.width = parseInt(command.width);
  command.height = parseInt(command.height);

  this.saliency.getSaliencyMapAsImage.call(this.saliency, image, command, (err, imageBytes) => {
    if (err) {
      this.saliency.emit('warn', err.stack || err);
      res.writeHead(400);
      res.end();
      return void cb && cb(err);
    }

    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(imageBytes);

    cb && cb(null, imageBytes);
  });
};

// requires explicitly being disabled
module.exports.cors = false;
