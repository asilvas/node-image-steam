var sharp = require('sharp');

module.exports = function (image, cb) {
  sharp(image.buffer).metadata(function (err, metadata) {
    if (err) return void cb(err);
    switch (metadata.format) {
      case 'jpeg':
        cb(null, 'image/jpeg');
        break;
      case 'png':
        cb(null, 'image/png');
        break;
      case 'gif':
        cb(null, 'image/gif');
        break;
      default:
        cb();
    }
  });
};
