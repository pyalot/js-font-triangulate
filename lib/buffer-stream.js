define('buffer-stream', function(exports) {
  var BufferStream;
  exports = BufferStream = (function() {

    function BufferStream(buffer, pos) {
      this.buffer = buffer;
      this.pos = pos != null ? pos : 0;
      this.view = new DataView(this.buffer);
    }

    BufferStream.prototype.seek = function(pos) {
      this.pos = pos;
      return this;
    };

    BufferStream.prototype.seekRel = function(offset) {
      return this.pos += offset;
    };

    BufferStream.prototype.int = function(value) {
      if (value != null) {
        this.view.setInt32(this.pos, value);
      } else {
        value = this.view.getInt32(this.pos);
      }
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.float = function(value) {
      if (value != null) {
        this.view.setFloat32(this.pos, value);
      } else {
        value = this.view.getFloat32(this.pos);
      }
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.uint = function(value) {
      if (value != null) {
        this.view.setUint32(this.pos, value);
      } else {
        value = this.view.getUint32(this.pos);
      }
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.ulong = function() {
      var a, b;
      a = this.uint();
      b = this.uint();
      return a * (1 << 32) + b;
    };

    BufferStream.prototype.short = function(value) {
      if (value != null) {
        this.view.setInt16(this.pos, value);
      } else {
        value = this.view.getInt16(this.pos);
      }
      this.pos += 2;
      return value;
    };

    BufferStream.prototype.ushort = function(value) {
      if (value != null) {
        this.view.setUint16(this.pos, value);
      } else {
        value = this.view.getUint16(this.pos);
      }
      this.pos += 2;
      return value;
    };

    BufferStream.prototype.fixed1616 = function() {
      return this.int() / (1 << 16);
    };

    BufferStream.prototype.ushortArray = function(count) {
      var result, _, _i;
      result = [];
      for (_ = _i = 0; 0 <= count ? _i < count : _i > count; _ = 0 <= count ? ++_i : --_i) {
        result.push(this.ushort());
      }
      return result;
    };

    BufferStream.prototype.byte = function(value) {
      if (value != null) {
        this.view.setUint8(this.pos, value);
      } else {
        value = this.view.getUint8(this.pos);
      }
      this.pos += 1;
      return value;
    };

    BufferStream.prototype.byteArray = function(count) {
      var result, _, _i;
      result = [];
      for (_ = _i = 0; 0 <= count ? _i < count : _i > count; _ = 0 <= count ? ++_i : --_i) {
        result.push(this.byte());
      }
      return result;
    };

    BufferStream.prototype.char = function(value) {
      var byte;
      if (value != null) {
        this.view.setUint8(this.pos, value.charCodeAt(0));
      } else {
        byte = this.view.getUint8(this.pos);
        value = String.fromCharCode(byte);
      }
      this.pos += 1;
      return value;
    };

    BufferStream.prototype.string = function(length) {
      var i, result, _i;
      result = '';
      for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
        result += this.char();
      }
      return result;
    };

    BufferStream.prototype.stream = function(offset) {
      return new BufferStream(this.buffer, offset);
    };

    BufferStream.prototype.streamRel = function(offset) {
      return new BufferStream(this.buffer, offset + this.pos);
    };

    return BufferStream;

  })();
  return exports;
});
