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

exports = (glyph, contours) ->
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
