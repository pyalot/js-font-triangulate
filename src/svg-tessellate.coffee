mix = (a, b, f) -> a*(1-f) + b*f

cubicBezier = (path, {from, to, control}) ->
    x1=from.x; y1=from.y
    x2=to.x; y2=to.y
    xc=control.x; yc=control.y
    numPoints = 10
    for i in [0...numPoints]
        f = i/numPoints
        xm1 = mix(x1, xc, f)
        ym1 = mix(y1, yc, f)
        
        xm2 = mix(xc, x2, f)
        ym2 = mix(yc, y2, f)

        xfrom = mix(xm1, xm2, f)
        yfrom = mix(ym1, ym2, f)

        f = (i+1)/numPoints
        xm1 = mix(x1, xc, f)
        ym1 = mix(y1, yc, f)
        
        xm2 = mix(xc, x2, f)
        ym2 = mix(yc, y2, f)

        xto = mix(xm1, xm2, f)
        yto = mix(ym1, ym2, f)

        path.push from: {x:xfrom, y:yfrom}, to:{x:xto, y:yto}

exports = svgTessellate = (commands) ->
    path = []
    for command in commands
        switch command.name
            when 'line'
                path.push command
            when 'bezier'
                cubicBezier path, command
    return path

