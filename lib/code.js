define('font', function(exports) {
  var BufferStream, CMap, Glyf, Head, Loca, Maxp, TTF, tableTypes;
  BufferStream = require('buffer-stream');
  tableTypes = {
    head: Head = (function() {

      function Head(stream) {
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

      return Head;

    })(),
    glyf: Glyf = (function() {
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
          this.contourEndPoints = this.stream.ushortArray(contourCount);
          instructionCount = this.stream.ushort();
          if (instructionCount > 1024 * 4) {
            console.warn('Malformed Font, instructionCount too large: ' + instructionCount);
            this.contours = [];
            return;
          }
          this.instructions = this.stream.byteArray(instructionCount);
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

      function Glyf(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      Glyf.prototype.parse = function() {
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

      return Glyf;

    })(),
    loca: Loca = (function() {

      function Loca(stream, tables) {
        this.stream = stream;
        this.tables = tables;
      }

      Loca.prototype.parse = function() {
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
          return this.offsets = this.stream.uintArray(this.tables.maxp.numGlyfs - 2);
        }
      };

      return Loca;

    })(),
    maxp: Maxp = (function() {

      function Maxp(stream) {
        var version;
        this.stream = stream;
        version = this.stream.uint();
        if (version !== 0x00010000) {
          throw 'Unknown Maxp version';
        }
        this.numGlyfs = this.stream.ushort();
      }

      return Maxp;

    })(),
    cmap: CMap = (function() {

      function CMap(stream) {
        var encodingId, found, i, offset, platformId, tableCount, version, _i;
        this.stream = stream;
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
          this.parseTable();
        } else {
          throw 'No cmap table found for windows/unicode';
        }
      }

      CMap.prototype.parseTable = function() {
        var char, charCode, endCode, endCodes, entrySelector, glyphIdx, idDelta, idDeltas, idOffset, idOffsets, idOffsetsAddress, language, length, offset, rangeShift, reservedPad, searchRange, segCount, segmentIdx, startCode, startCodes, _i, _len, _results;
        length = this.stream.ushort();
        language = this.stream.ushort();
        segCount = this.stream.ushort() / 2;
        searchRange = this.stream.ushort();
        entrySelector = this.stream.ushort();
        rangeShift = this.stream.ushort();
        endCodes = this.stream.ushortArray(segCount);
        if (endCodes[endCodes.length - 1] !== 0xffff) {
          throw 'Invalid end code table';
        }
        reservedPad = this.stream.ushort();
        if (reservedPad !== 0) {
          throw 'reservedPad was not 0';
        }
        startCodes = this.stream.ushortArray(segCount);
        idDeltas = this.stream.ushortArray(segCount);
        idOffsetsAddress = this.stream.getPos();
        idOffsets = this.stream.ushortArray(segCount);
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
              this.chars.push(char);
              _results1.push(this.char2glyph[char] = glyphIdx);
            }
            return _results1;
          }).call(this));
        }
        return _results;
      };

      return CMap;

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
    }

    TTF.prototype.chars = function() {
      return this.tables.cmap.chars;
    };

    TTF.prototype.getGlyph = function(char) {
      var glyph, glyphIdx;
      glyphIdx = this.tables.cmap.char2glyph[char];
      glyph = this.tables.glyf.glyphs[glyphIdx];
      return glyph;
    };

    return TTF;

  })();
  return exports;
});

define('triangulate', function(exports) {
  /* resources
     http://www.personal.kent.edu/~rmuhamma/Compgeometry/MyCG/PolyPart/polyPartition.htm
     http://www.gisdevelopment.net/application/miscellaneous/mi08_211.htm
     http://stackoverflow.com/questions/694108/decomposition-to-convex-polygons
     http://www.cs.unc.edu/~dm/CODE/GEM/chapter.html
     http://vterrain.org/Implementation/Libs/triangulate.html
     http://www.codeproject.com/Articles/44370/Triangulation-of-Arbitrary-Polygons
     http://mathworld.wolfram.com/Triangulation.html
     http://www.cs.cmu.edu/~quake/triangle.html
     http://www.amazon.com/Computational-Geometry-Applications-Mark-Berg/dp/3642096816/
     http://www.amazon.com/Computational-Geometry-Cambridge-Theoretical-Computer/dp/0521649765/
     http://www.amazon.com/Triangulations-Structures-Applications-Computation-Mathematics/dp/3642129706/
     http://research.engineering.wustl.edu/~pless/546/lectures/l7.html
  */

  var byX, byY, extractPath, getPoints, remove;
  extractPath = function(contour) {
    var i, line, p1, p2, p3, path, _i, _j, _len, _ref;
    path = [];
    for (_i = 0, _len = contour.length; _i < _len; _i++) {
      line = contour[_i];
      path.push({
        x: line.from.x,
        y: line.from.y
      });
    }
    for (i = _j = 0, _ref = path.length; 0 <= _ref ? _j <= _ref : _j >= _ref; i = 0 <= _ref ? ++_j : --_j) {
      p1 = path[(i + 0) % path.length];
      p2 = path[(i + 1) % path.length];
      p3 = path[(i + 2) % path.length];
      p2.prev = p1;
      p2.next = p3;
    }
    return path;
  };
  byX = function(a, b) {
    if (a.x > b.x) {
      return 1;
    } else if (a.x < b.x) {
      return -1;
    } else {
      return 0;
    }
  };
  byY = function(a, b) {
    if (a.y > b.y) {
      return 1;
    } else if (a.y < b.y) {
      return -1;
    } else {
      return 0;
    }
  };
  remove = function(list, item) {
    var idx;
    idx = list.indexOf(item);
    if (idx >= 0) {
      return list.splice(idx, 1);
    }
  };
  getPoints = function(contours) {
    var contour, last, point, points, result, _i, _j, _k, _len, _len1, _len2;
    points = [];
    for (_i = 0, _len = contours.length; _i < _len; _i++) {
      contour = contours[_i];
      for (_j = 0, _len1 = contour.length; _j < _len1; _j++) {
        point = contour[_j];
        points.push(point.from);
      }
    }
    points.sort(byX);
    result = [points[0]];
    last = points[0];
    for (_k = 0, _len2 = points.length; _k < _len2; _k++) {
      point = points[_k];
      if (point.x > last.x) {
        last = point;
        result.push(point);
      }
    }
    return result;
  };
  exports = function(glyph, contours) {
    var cx, cy, h, points, w;
    points = getPoints(contours);
    cx = glyph.centerX;
    cy = glyph.centerY;
    w = glyph.width / 2;
    h = glyph.height / 2;
    return [
      {
        x: cx - w,
        y: cy - h
      }, {
        x: cx - w,
        y: cy + h
      }, {
        x: cx + w,
        y: cy + h
      }, {
        x: cx - w,
        y: cy - h
      }, {
        x: cx + w,
        y: cy + h
      }, {
        x: cx + w,
        y: cy - h
      }
    ];
  };
  return exports;
});

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

    BufferStream.prototype.seekRel = function(offset) {
      this.pos += offset;
      return this;
    };

    BufferStream.prototype.int = function() {
      var value;
      value = this.view.getInt32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.float = function() {
      var value;
      value = this.view.getFloat32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.uint = function() {
      var value;
      value = this.view.getUint32(this.pos);
      this.pos += 4;
      return value;
    };

    BufferStream.prototype.uintArray = function(count) {
      var i, result, _i;
      result = new Uint32Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.uint();
      }
      return result;
    };

    BufferStream.prototype.ulong = function() {
      var a, b;
      a = this.uint();
      b = this.uint();
      return a * (1 << 32) + b;
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

    BufferStream.prototype.fixed1616 = function() {
      return this.int() / (1 << 16);
    };

    BufferStream.prototype.ushortArray = function(count) {
      var i, result, _i;
      result = new Uint16Array(count);
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        result[i] = this.ushort();
      }
      return result;
    };

    BufferStream.prototype.byte = function() {
      var value;
      value = this.view.getUint8(this.pos);
      this.pos += 1;
      return value;
    };

    BufferStream.prototype.byteArray = function(count) {
      var result;
      result = new Uint8Array(this.buffer, this.pos, count);
      this.pos += count;
      return result;
    };

    BufferStream.prototype.char = function() {
      var byte, value;
      byte = this.view.getUint8(this.pos);
      value = String.fromCharCode(byte);
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
      return new BufferStream(this.buffer, offset, this.view);
    };

    BufferStream.prototype.streamRel = function(offset) {
      return new BufferStream(this.buffer, offset + this.pos, this.view);
    };

    return BufferStream;

  })();
  return exports;
});

define('svg-tessellate', function(exports) {
  var cubicBezier, mix, stepsPerRadians, svgTessellate;
  mix = function(a, b, f) {
    return a * (1 - f) + b * f;
  };
  stepsPerRadians = Math.PI / 6;
  cubicBezier = function(path, _arg) {
    var control, f, from, i, numPoints, to, x1, x2, xc, xfrom, xm1, xm2, xto, y1, y2, yc, yfrom, ym1, ym2, yto, _i, _results;
    from = _arg.from, to = _arg.to, control = _arg.control;
    x1 = from.x;
    y1 = from.y;
    x2 = to.x;
    y2 = to.y;
    xc = control.x;
    yc = control.y;
    numPoints = 5;
    _results = [];
    for (i = _i = 0; 0 <= numPoints ? _i < numPoints : _i > numPoints; i = 0 <= numPoints ? ++_i : --_i) {
      f = i / numPoints;
      xm1 = mix(x1, xc, f);
      ym1 = mix(y1, yc, f);
      xm2 = mix(xc, x2, f);
      ym2 = mix(yc, y2, f);
      xfrom = mix(xm1, xm2, f);
      yfrom = mix(ym1, ym2, f);
      f = (i + 1) / numPoints;
      xm1 = mix(x1, xc, f);
      ym1 = mix(y1, yc, f);
      xm2 = mix(xc, x2, f);
      ym2 = mix(yc, y2, f);
      xto = mix(xm1, xm2, f);
      yto = mix(ym1, ym2, f);
      _results.push(path.push({
        from: {
          x: xfrom,
          y: yfrom
        },
        to: {
          x: xto,
          y: yto
        }
      }));
    }
    return _results;
  };
  exports = svgTessellate = function(commands) {
    var command, path, _i, _len;
    path = [];
    for (_i = 0, _len = commands.length; _i < _len; _i++) {
      command = commands[_i];
      switch (command.name) {
        case 'line':
          path.push(command);
          break;
        case 'bezier':
          cubicBezier(path, command);
      }
    }
    return path;
  };
  return exports;
});
