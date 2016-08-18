var sharp = require('sharp');

var image = sharp('./test/files/bad-crop.jpg');

image
  .toFormat('webp')
  .toBuffer(function(err, outputBuffer, info) {
    console.log(info);
    sharp(outputBuffer)
     .ignoreAspectRatio()
     .resize(233, 131)
     .extract({ top: 1, left: 0, width: 233, height: 130 })
     .toFormat('jpeg')
     .toFile('result.jpg')
     ;

  });

