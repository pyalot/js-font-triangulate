define('triangulate', function(exports) {
  var byX, byY, extractPath, remove;
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
  exports = function(contours) {
    var path;
    path = extractPath(contours[0]);
    return [];
  };
  return exports;
});
