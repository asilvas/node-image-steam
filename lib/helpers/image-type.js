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

function detectByFileContent (path, cb) {
  sharp(path).metadata(function(err, metadata){
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
  var regex = imageContentTypes[contentType].acceptRegEx;
  if (!regex) return false;
  var acceptsHeader = req.headers.accept;
  return !acceptsHeader || regex.test(acceptsHeader)
}

module.exports = function (req, path, guessType, cb) {
  var contentType = detectByFileName(path);
  if (browserAccepts(contentType)) return void cb(null,contentType);
  detectByFileContent(path,function(err,contentType){
    if (err) return void cb(err);
    if (!contentType) return void cb(null,'unknown');
    if (browserAccepts(contentType)) return void cb(null,contentType);
    return null;
  });
}
