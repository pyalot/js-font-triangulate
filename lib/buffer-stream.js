define('buffer-stream', function(exports) {
  var BufferStream;
  exports = BufferStream = (function() {

    function BufferStream(buffer, pos, view) {
      this.buffer = buffer;
      this.pos = pos != null ? pos : 0;
      this.view = view != null ? view : null;
      this.start = this.pos;
      if (this.view === null) {
        this.view = new DataView(this.buffer);
      }
    }

    BufferStream.prototype.getPos = function() {
      return this.pos - this.start;
    };

    BufferStream.prototype.seek = function(pos) {
      this.pos = this.start + pos;
      return this;
    };

    BufferStream.prototype.stream = function(offset) {
      return new BufferStream(this.buffer, offset, this.view);
    };

    BufferStream.prototype.streamRel = function(offset) {
      return new BufferStream(this.buffer, offset + this.pos, this.view);
    };

    BufferStream.prototype.byte = function() {
      var value;
      value = this.view.getUint8(this.pos);
      this.pos += 1;
      return value;
    };

    BufferStream.prototype.char = function() {
      var byte, value;
      byte = this.view.getUint8(this.pos);
      value = String.fromCharCode(byte);
      this.pos += 1;
      return value;
    };

    BufferStream.prototype.short = function() {
      var value;
      value = this.view.getInt16(this.pos);
      this.pos += 2;
      return value;
    };

    BufferStream.prototype.ushort = function() {
      var value;
      value = this.view.getUint16(this.pos);
      this.pos += 2;
      return value;
    };

    BufferStream.prototype.int = function() {
      var value;
      value = this.view.getInt32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.uint = function() {
      var value;
      value = this.view.getUint32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.float = function() {
      var value;
      value = this.view.getFloat32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.ulong = function() {
      var a, b;
      a = this.uint();
      b = this.uint();
      return a * (1 << 32) + b;
    };

    BufferStream.prototype.fixed1616 = function() {
      return this.int() / (1 << 16);
    };

    BufferStream.prototype.bytes = function(count) {
      var result;
      result = new Uint8Array(this.buffer, this.pos, count);
      this.pos += count;
      return result;
    };

    BufferStream.prototype.string = function(length) {
      var i, result, _i;
      result = '';
      for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
        result += this.char();
      }
      return result;
    };

    BufferStream.prototype.shorts = function(count) {
      var i, result, _i;
      result = new Int16Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.short();
      }
      return result;
    };

    BufferStream.prototype.ushorts = function(count) {
      var i, result, _i;
      result = new Uint16Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.ushort();
      }
      return result;
    };

    BufferStream.prototype.ints = function(count) {
      var i, result, _i;
      result = new Int32Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.int();
      }
      return result;
    };

    BufferStream.prototype.uints = function(count) {
      var i, result, _i;
      result = new Uint32Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.uint();
      }
      return result;
    };

    return BufferStream;

  })();
  return exports;
});
