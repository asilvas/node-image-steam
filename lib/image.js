module.exports = Image;

function Image(info, buffer) {
  this.info = info || {};
  this.buffer = buffer;
}

var p = Image.prototype;

Object.defineProperty(p, "contentType", {
  get: function () {
    return this.info && ('image/' + this.info.format);
  }
});
