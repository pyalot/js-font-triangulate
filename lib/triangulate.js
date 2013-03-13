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
