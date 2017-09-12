const getColors = require('image-pal-sharp/lib/hsluv');

module.exports = (command, image, reqInfo, req, res, cb) => {
  const options = {
    srcBuffer: image.buffer,
    width: command.width ? Math.max(20, Math.min(200, parseInt(command.width))) : 100,
    height: command.height ? Math.max(20, Math.min(200, parseInt(command.height))) : null,
    maxColors: command.maxColors ? Math.max(2, Math.min(32, parseInt(command.maxColors))) : 10,
    cubicCells: command.cubicCells ? Math.max(3, Math.min(4, parseInt(command.cubicCells))) : 4,
    mean: command.mean === 'false' ? false : true,
    order: command.order === 'density' ? 'density' : 'distance'
  };

  getColors(options, (err, colors) => {
    if (err) {
      res.writeHead(400);
      res.end();
      return void cb && cb(err);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      colors: colors
    }));

    cb && cb(null, colors);
  });
};
