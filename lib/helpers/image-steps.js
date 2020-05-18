var XXHash = require('xxhash');

module.exports = {
  getHashFromSteps: getHashFromSteps
};

function getHashFromSteps(imageSteps) {
  // IMPORTANT! DO NOT EVER CHANGE MY SEED VALUE UNLESS YOU WANT TO INVALIDATE
  //            EXISTING PROCESSED IMAGES!
  return XXHash.hash(Buffer.from(JSON.stringify(imageSteps)), 0xABCD1133);
}
