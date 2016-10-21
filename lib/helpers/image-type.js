var fs = require('fs');
var sharp = require('sharp');

var imageContentTypes = {
  'image/png': {
    pathRegEx: /\.png$/,
    acceptRegEx: /image\/png|\*\/\*/
  },
  'image/jpeg': {
    pathRegEx: /\.jpg$/,
    acceptRegEx: /image\/jpeg|\*\/\*/
  },
  'image/gif': {
    pathRegEx: /\.git$/,
    acceptRegEx: /image\/gif|\*\/\*/
  }
};

var imageContentTypeKeys = Object.keys(imageContentTypes);

function detectByFileName (path) {
  for (var i = 0; i < imageContentTypeKeys.length; i++) {
    var contentType = imageContentTypeKeys[i];
    var regex = imageContentTypes[contentType].pathRegEx;
    if (regex.test(path)) return contentType;
  }
}

function detectByFileContent (image, cb) {
  sharp(image.buffer).metadata(function(err, metadata){
    if (err) return void cb(err);
    switch(metadata.format) {
      case 'jpeg':
        cb(null,'image/jpeg');
        break;
      case 'png':
        cb(null,'image/png');
        break;
      case 'gif':
        cb(null,'image/gif');
        break;
      default:
        cb();
    }
  });
}

function browserAccepts (contentType,req) {
  ctInfo = imageContentTypes[contentType];
  if (!ctInfo) return false;
  var regex = ctInfo.acceptRegEx;
  if (!regex) return false;
  var acceptsHeader = req.headers.accept;
  return !acceptsHeader || regex.test(acceptsHeader)
}

module.exports = function (req, image, cb) {
  var contentType = detectByFileName(image.info.path);
  if (browserAccepts(contentType,req)) return void cb(null,contentType);
  detectByFileContent(image,function(err,contentType){
    if (err) return cb(err);
    if (!contentType) return cb(null,'unknown');
    cb(null,contentType);
  });
}
