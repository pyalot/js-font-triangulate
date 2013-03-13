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
