var crypto = require('crypto');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var defaults = require('./security-defaults');

module.exports = Security;

function Security(options) {
  if (!(this instanceof Security)) {
    return new Security(options);
  }

  EventEmitter.call(this);
  this.options = _.merge({}, defaults, options || {});

}

var p = Security.prototype = new EventEmitter();

p.checkSignature = function(toSign, signature){
  var $this = this;

  if (!$this.options.enabled) {
    return;
  }

  if(!signature || typeof signature !== 'string'){
    throw new SecurityError('This resource is protected, please use a signed url');
  }

  var shasum = crypto.createHash($this.options.algorithm);
  shasum.update(utf8_encode(toSign + $this.options.secret));
  var expectedSignature = shasum.digest('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 8);

  if(signature !== expectedSignature){
    throw new SecurityError('Signature does not match');
  }
}

p.SecurityError = SecurityError;

function SecurityError(message) {
  this.message = message;
}

SecurityError.prototype = Object.create(Error.prototype);
SecurityError.prototype.name = "SecurityError";
SecurityError.prototype.message = "";
SecurityError.prototype.constructor = SecurityError;


//From https://github.com/cloudinary/cloudinary_npm
function utf8_encode(argString) {
  var c1, enc, end, n, start, string, stringl, utftext;
  if (argString == null) {
    return "";
  }
  string = argString + "";
  utftext = "";
  start = void 0;
  end = void 0;
  stringl = 0;
  start = end = 0;
  stringl = string.length;
  n = 0;
  while (n < stringl) {
    c1 = string.charCodeAt(n);
    enc = null;
    if (c1 < 128) {
      end++;
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
    } else {
      enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.slice(start, end);
      }
      utftext += enc;
      start = end = n + 1;
    }
    n++;
  }
  if (end > start) {
    utftext += string.slice(start, stringl);
  }
  return utftext;
}