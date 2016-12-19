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

  if(this.options.enabled && !this.options.secret){
    throw new SecurityError('You must set a secret to enable Security');
  }

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
  shasum.update(toSign + $this.options.secret);
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