var XXHash = require('xxhash');

module.exports = getHashFromImage;

function getHashFromImage(image) {
  // IMPORTANT! DO NOT EVER CHANGE MY SEED VALUE UNLESS YOU WANT TO INVALIDATE
  //            EXISTING PROCESSED IMAGES!
  return XXHash.hash(image.buffer, 0xABCD1133);
}
