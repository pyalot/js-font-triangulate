### resources
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
###

extractPath = (contour) ->
    path = []
    for line in contour
        path.push x:line.from.x, y:line.from.y

    for i in [0..path.length]
        p1 = path[(i+0)%path.length]
        p2 = path[(i+1)%path.length]
        p3 = path[(i+2)%path.length]
        p2.prev = p1
        p2.next = p3

    return path

byX = (a,b) ->
    if a.x > b.x then 1
    else if a.x < b.x then -1
    else 0

byY = (a,b) ->
    if a.y > b.y then 1
    else if a.y < b.y then -1
    else 0

remove = (list, item) ->
    idx = list.indexOf item
    if idx >= 0
        list.splice idx, 1

getPoints = (contours) ->
    points = []
    for contour in contours
        for point in contour
            points.push point.from
    points.sort byX

    result = [points[0]]
    last = points[0]

    for point in points
        if point.x > last.x
            last = point
            result.push point
            
    return result

exports = (glyph, contours) ->
    points = getPoints contours

    ## dummy code ##
    cx = glyph.centerX
    cy = glyph.centerY

    w = glyph.width/2
    h = glyph.height/2

    return [
        {x:cx-w,y:cy-h},
        {x:cx-w,y:cy+h},
        {x:cx+w,y:cy+h},
        
        {x:cx-w,y:cy-h},
        {x:cx+w,y:cy+h},
        {x:cx+w,y:cy-h},
    ]
