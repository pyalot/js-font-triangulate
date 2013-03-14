define('font', function(exports) {
  /* useful specifications
      https://developer.apple.com/fonts/TTRefMan/RM06/Chap6.html
      http://scripts.sil.org/cms/scripts/page.php?item_id=IWS-Chapter08
  */

  var BufferStream, TTF, tableTypes;
  BufferStream = require('buffer-stream');
  tableTypes = {
    head: (function() {

      function _Class(stream) {
        var checkSumAdjustment, magic;
        this.stream = stream;
        this.version = this.stream.fixed1616();
        this.revision = this.stream.fixed1616();
        checkSumAdjustment = this.stream.uint();
        magic = this.stream.uint();
        if (magic !== 0x5f0f3cf5) {
          throw 'ttf magic did not match';
        }
        this.flags = this.stream.ushort();
        this.unitsPerEm = this.stream.ushort();
        this.created = this.stream.ulong();
        this.modified = this.stream.ulong();
        this.xmin = this.stream.short() / this.unitsPerEm;
        this.ymin = this.stream.short() / this.unitsPerEm;
        this.xmax = this.stream.short() / this.unitsPerEm;
        this.ymax = this.stream.short() / this.unitsPerEm;
        this.style = this.stream.ushort();
        this.smallestReadablePixelSize = this.stream.ushort();
        this.directionHint = this.stream.short();
        this.locaFormat = this.stream.short();
        this.glyphFormat = this.stream.short();
        if (this.glyphFormat !== 0) {
          throw 'Unknown Glyph Format';
        }
      }

      return _Class;

    })(),
    glyf: (function() {
      var Glyph;

      Glyph = (function() {

        function Glyph(tables, stream) {
          var contourCount, flag, instructionCount, repeat, _, _i;
          this.tables = tables;
          this.stream = stream;
          this.unitsPerEm = this.tables.head.unitsPerEm;
          contourCount = this.stream.short();
          if (contourCount === -1) {
            this.contours = [];
            return;
          }
          this.xmin = this.stream.short() / this.unitsPerEm;
          this.ymin = this.stream.short() / this.unitsPerEm;
          this.xmax = this.stream.short() / this.unitsPerEm;
          this.ymax = this.stream.short() / this.unitsPerEm;
          this.width = this.xmax - this.xmin;
          this.height = this.ymax - this.ymin;
          this.centerX = (this.xmax + this.xmin) / 2;
          this.centerY = (this.ymax + this.ymin) / 2;
          this.contourEndPoints = this.stream.ushorts(contourCount);
          instructionCount = this.stream.ushort();
          if (instructionCount > 1024 * 4) {
            console.warn('Malformed Font, instructionCount too large: ' + instructionCount);
            this.contours = [];
            return;
          }
          this.instructions = this.stream.bytes(instructionCount);
          this.coordinatesCount = this.contourEndPoints[this.contourEndPoints.length - 1];
          this.flags = [];
          while (this.flags.length <= this.coordinatesCount) {
            flag = this.stream.byte();
            this.flags.push(flag);
            if ((flag & 1 << 3) > 0) {
              repeat = this.stream.byte();
              for (_ = _i = 0; 0 <= repeat ? _i < repeat : _i > repeat; _ = 0 <= repeat ? ++_i : --_i) {
                this.flags.push(flag);
              }
            }
          }
          this.coords = (function() {
            var _j, _len, _ref, _results;
            _ref = this.flags;
            _results = [];
            for (_j = 0, _len = _ref.length; _j < _len; _j++) {
              flag = _ref[_j];
              _results.push({
                onCurve: (flag & 1 << 0) > 0
              });
            }
            return _results;
          }).call(this);
          this.addCoords(1, 4, 'x');
          this.addCoords(2, 5, 'y');
          this.readPath();
        }

        Glyph.prototype.addCoords = function(isByteBit, sameBit, name) {
          var flag, i, same, value, _i, _len, _ref;
          value = 0;
          _ref = this.flags;
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            flag = _ref[i];
            same = (flag & 1 << sameBit) > 0;
            if ((flag & 1 << isByteBit) > 0) {
              if (same) {
                value += this.stream.byte();
              } else {
                value -= this.stream.byte();
              }
            } else if (!same) {
              value += this.stream.short();
            }
            this.coords[i][name] = value / this.unitsPerEm;
          }
        };

        Glyph.prototype.readPath = function() {
          var c1, c2, c3, contours, coords, end, i, path, start, xm, xm1, xm2, ym, ym1, ym2, _i, _j, _len, _len1, _ref;
          this.contours = [];
          contours = [];
          start = 0;
          _ref = this.contourEndPoints;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            end = _ref[_i];
            coords = this.coords.slice(start, end + 1);
            while (coords[0].onCurve === false && coords[1].onCurve === true) {
              coords.push(coords.shift());
            }
            contours.push(coords);
            start = end + 1;
          }
          for (_j = 0, _len1 = contours.length; _j < _len1; _j++) {
            coords = contours[_j];
            path = [];
            this.contours.push(path);
            i = 0;
            while (i < coords.length) {
              c1 = coords[(i + 0) % coords.length];
              c2 = coords[(i + 1) % coords.length];
              if (c1.onCurve) {
                if (c2.onCurve) {
                  i += 1;
                  path.push({
                    name: 'line',
                    from: {
                      x: c1.x,
                      y: c1.y
                    },
                    to: {
                      x: c2.x,
                      y: c2.y
                    }
                  });
                } else {
                  c3 = coords[(i + 2) % coords.length];
                  if (c3.onCurve) {
                    i += 2;
                    path.push({
                      name: 'bezier',
                      from: {
                        x: c1.x,
                        y: c1.y
                      },
                      control: {
                        x: c2.x,
                        y: c2.y
                      },
                      to: {
                        x: c3.x,
                        y: c3.y
                      }
                    });
                  } else {
                    i += 1;
                    xm = (c2.x + c3.x) / 2;
                    ym = (c2.y + c3.y) / 2;
                    path.push({
                      name: 'bezier',
                      from: {
                        x: c1.x,
                        y: c1.y
                      },
                      control: {
                        x: c2.x,
                        y: c2.y
                      },
                      to: {
                        x: xm,
                        y: ym
                      }
                    });
                  }
                }
              } else {
                if (c2.onCurve) {
                  throw 'wtf?';
                } else {
                  c3 = coords[(i + 2) % coords.length];
                  if (c3.onCurve) {
                    i += 2;
                    xm = (c1.x + c2.x) / 2;
                    ym = (c1.y + c2.y) / 2;
                    path.push({
                      name: 'bezier',
                      from: {
                        x: xm,
                        y: ym
                      },
                      control: {
                        x: c2.x,
                        y: c2.y
                      },
                      to: {
                        x: c3.x,
                        y: c3.y
                      }
                    });
                  } else {
                    i += 1;
                    xm1 = (c1.x + c2.x) / 2;
                    ym1 = (c1.y + c2.y) / 2;
                    xm2 = (c2.x + c3.x) / 2;
                    ym2 = (c2.y + c3.y) / 2;
                    path.push({
                      name: 'bezier',
                      from: {
                        x: xm1,
                        y: ym1
                      },
                      control: {
                        x: c2.x,
                        y: c2.y
                      },
                      to: {
                        x: xm2,
                        y: ym2
                      }
                    });
                  }
                }
              }
            }
          }
          if (this.contours.length === 1 && this.contours[0].length === 0) {
            return this.contours = [];
          }
        };

        return Glyph;

      })();

      function _Class(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      _Class.prototype.parse = function() {
        var offset;
        return this.glyphs = (function() {
          var _i, _len, _ref, _results;
          _ref = this.tables.loca.offsets;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            offset = _ref[_i];
            _results.push(new Glyph(this.tables, this.stream.streamRel(offset)));
          }
          return _results;
        }).call(this);
      };

      return _Class;

    })(),
    loca: (function() {

      function _Class(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      _Class.prototype.parse = function() {
        var i;
        if (this.tables.head.locaFormat === 0) {
          return this.offsets = (function() {
            var _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.tables.maxp.numGlyfs - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(this.stream.ushort() * 2);
            }
            return _results;
          }).call(this);
        } else {
          return this.offsets = this.stream.uints(this.tables.maxp.numGlyfs - 2);
        }
      };

      return _Class;

    })(),
    maxp: (function() {

      function _Class(stream) {
        var version;
        this.stream = stream;
        version = this.stream.uint();
        if (version !== 0x00010000) {
          throw 'Unknown Maxp version';
        }
        this.numGlyfs = this.stream.ushort();
      }

      return _Class;

    })(),
    cmap: (function() {

      function _Class(stream, tables) {
        var encodingId, found, i, offset, platformId, tableCount, version, _i;
        this.stream = stream;
        this.tables = tables;
        version = this.stream.ushort();
        if (version !== 0) {
          throw 'cmap invalid version: ' + version;
        }
        tableCount = this.stream.ushort();
        found = false;
        for (i = _i = 0; 0 <= tableCount ? _i < tableCount : _i > tableCount; i = 0 <= tableCount ? ++_i : --_i) {
          platformId = this.stream.ushort();
          encodingId = this.stream.ushort();
          offset = this.stream.uint();
          if (platformId === 3 && encodingId === 1) {
            found = true;
            break;
          }
        }
        if (found) {
          this.stream.seek(offset);
          version = this.stream.ushort();
          if (version !== 4) {
            throw 'Invalid cmap version: ' + version;
          }
        } else {
          throw 'No cmap table found for windows/unicode';
        }
      }

      _Class.prototype.parse = function() {
        var char, charCode, endCode, endCodes, entrySelector, glyph, glyphIdx, idDelta, idDeltas, idOffset, idOffsets, idOffsetsAddress, language, length, offset, rangeShift, reservedPad, searchRange, segCount, segmentIdx, startCode, startCodes, _i, _len, _results;
        length = this.stream.ushort();
        language = this.stream.ushort();
        segCount = this.stream.ushort() / 2;
        searchRange = this.stream.ushort();
        entrySelector = this.stream.ushort();
        rangeShift = this.stream.ushort();
        endCodes = this.stream.ushorts(segCount);
        if (endCodes[endCodes.length - 1] !== 0xffff) {
          throw 'Invalid end code table';
        }
        reservedPad = this.stream.ushort();
        if (reservedPad !== 0) {
          throw 'reservedPad was not 0';
        }
        startCodes = this.stream.ushorts(segCount);
        idDeltas = this.stream.ushorts(segCount);
        idOffsetsAddress = this.stream.getPos();
        idOffsets = this.stream.ushorts(segCount);
        this.char2glyph = {};
        this.chars = [];
        _results = [];
        for (segmentIdx = _i = 0, _len = startCodes.length; _i < _len; segmentIdx = ++_i) {
          startCode = startCodes[segmentIdx];
          idDelta = idDeltas[segmentIdx];
          endCode = endCodes[segmentIdx];
          offset = idOffsets[segmentIdx];
          if (endCode === 0xffff) {
            break;
          }
          _results.push((function() {
            var _j, _results1;
            _results1 = [];
            for (charCode = _j = startCode; startCode <= endCode ? _j <= endCode : _j >= endCode; charCode = startCode <= endCode ? ++_j : --_j) {
              if (offset === 0) {
                glyphIdx = (charCode + idDelta) % 65536;
              } else {
                idOffset = offset + (charCode - startCode) * 2 + idOffsetsAddress + segmentIdx * 2;
                glyphIdx = this.stream.seek(idOffset).ushort();
              }
              char = String.fromCharCode(charCode);
              glyph = this.tables.glyf.glyphs[glyphIdx];
              if (glyph !== void 0) {
                this.chars.push(char);
                _results1.push(this.char2glyph[char] = glyph);
              } else {
                _results1.push(void 0);
              }
            }
            return _results1;
          }).call(this));
        }
        return _results;
      };

      return _Class;

    })(),
    hhea: (function() {

      function _Class(stream) {
        var dataFormat, reserved, version;
        this.stream = stream;
        version = this.stream.uint();
        if (version !== 0x00010000) {
          throw 'Wrong HHEA version: ' + version;
        }
        this.ascent = this.stream.short();
        this.descent = this.stream.short();
        this.lineGap = this.stream.short();
        this.advanceWidthMax = this.stream.ushort();
        this.minLeftSideBearing = this.stream.short();
        this.minRightSideBearing = this.stream.short();
        this.xMaxExtent = this.stream.short();
        this.carretSlopeRise = this.stream.short();
        this.carretSlopeRun = this.stream.short();
        this.carretOffset = this.stream.short();
        reserved = this.stream.shorts(4);
        dataFormat = this.stream.short();
        if (dataFormat !== 0) {
          throw 'Wrong HHEA metric data format';
        }
        this.metricCount = this.stream.ushort();
      }

      return _Class;

    })(),
    hmtx: (function() {

      function _Class(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      _Class.prototype.parse = function() {
        var i;
        return this.metrics = (function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = this.tables.hhea.metricCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            _results.push({
              advance: this.stream.ushort(),
              bearing: this.stream.short()
            });
          }
          return _results;
        }).call(this);
      };

      return _Class;

    })(),
    vhea: (function() {

      function _Class(stream) {
        var dataFormat, reserved, version;
        this.stream = stream;
        version = this.stream.uint();
        if (version !== 0x00010000) {
          throw 'Wrong HHEA version: ' + version;
        }
        this.ascent = this.stream.short();
        this.descent = this.stream.short();
        this.lineGap = this.stream.short();
        this.minTopSideBearing = this.stream.short();
        this.minBottomSideBearing = this.stream.short();
        this.yMaxExtent = this.stream.short();
        this.carretSlopeRise = this.stream.short();
        this.carretSlopeRun = this.stream.short();
        this.carretOffset = this.stream.short();
        reserved = this.stream.shorts(4);
        dataFormat = this.stream.short();
        if (dataFormat !== 0) {
          throw 'Wrong HHEA metric data format';
        }
        this.metricCount = this.stream.ushort();
        console.log(this.metricCount);
      }

      return _Class;

    })(),
    vmtx: (function() {

      function _Class(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      _Class.prototype.parse = function() {
        var i;
        return this.metrics = (function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = this.tables.vhea.metricCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            _results.push({
              advance: this.stream.ushort(),
              bearing: this.stream.short()
            });
          }
          return _results;
        }).call(this);
      };

      return _Class;

    })(),
    kern: (function() {

      function _Class(stream) {
        var numTables, version;
        this.stream = stream;
        version = this.stream.uint();
        if (version === 0x00010000) {
          numTables = this.stream.uint();
        } else {
          this.stream.seek(0);
          version = this.stream.ushort();
          numTables = this.stream.ushort();
          if (version !== 0) {
            throw 'incompatible kern format';
          }
        }
      }

      return _Class;

    })()
  };
  exports = TTF = (function() {

    function TTF(buffer) {
      var checkSum, cls, i, length, name, offset, tableCount, type, _i;
      this.buffer = buffer;
      this.stream = new BufferStream(this.buffer);
      type = this.stream.uint();
      if (type === 0x00010000) {
        this.type = 'truetype';
      } else if (this.version === 0x4f54544f) {
        this.type = 'opentype';
      } else {
        this.type = 'UNKNOWN';
      }
      console.log('Font Type: ', this.type);
      tableCount = this.stream.ushort();
      this.stream.seek(12);
      this.tables = {};
      for (i = _i = 0; 0 <= tableCount ? _i < tableCount : _i > tableCount; i = 0 <= tableCount ? ++_i : --_i) {
        name = this.stream.string(4);
        checkSum = this.stream.uint();
        offset = this.stream.uint();
        length = this.stream.uint();
        cls = tableTypes[name];
        if (cls != null) {
          this.tables[name] = new cls(this.stream.stream(offset), this.tables);
        }
      }
      this.tables.loca.parse();
      this.tables.glyf.parse();
      this.tables.cmap.parse();
      if (this.tables.hhea) {
        this.tables.hmtx.parse();
      }
      if (this.tables.vhea) {
        this.tables.vmtx.parse();
      }
    }

    TTF.prototype.chars = function() {
      return this.tables.cmap.chars;
    };

    TTF.prototype.getGlyph = function(char) {
      return this.tables.cmap.char2glyph[char];
    };

    return TTF;

  })();
  return exports;
});
