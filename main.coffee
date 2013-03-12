loadBuffer = ({path, load, progress, error}) ->
    request = new XMLHttpRequest()
    request.open 'GET', path, true
    request.responseType = 'arraybuffer'
    request.onload = (a,b,c) ->
        if request.status in [200, 304]
            if load then load request.response
        else
            error request.statusText
    request.onprogress = (event) ->
        if progress and event.lengthComputable
            progress event.loaded/event.total
    request.send()

TTF = require 'font'
svgTessellate = require 'svg-tessellate'
triangulate = require 'triangulate'

ctx = null
canvas = null
stats = null

drawOutline = (glyph, contours) ->
    ctx.save()
    ctx.translate canvas.width/2, canvas.height/2
    ctx.strokeStyle = 'red'
    extend = Math.max(glyph.width, glyph.height)
    scale = 500/extend
    ctx.scale(1, -1)
    ctx.translate -glyph.centerX*scale, -glyph.centerY*scale

    for contour in contours
        for line in contour
            ctx.beginPath()
            ctx.moveTo line.from.x*scale, line.from.y*scale
            ctx.lineTo line.to.x*scale, line.to.y*scale
            ctx.stroke()
    ctx.restore()

drawTriangles = (glyph, contours) ->
    start = performance.now()
    triangles = triangulate glyph, contours
    end = performance.now()
    
    ctx.save()
    ctx.translate canvas.width/2, canvas.height/2
    ctx.strokeStyle = 'black'
    ctx.fillStyle = 'green'
    extend = Math.max(glyph.width, glyph.height)
    scale = 500/extend
    ctx.scale(1, -1)
    ctx.translate -glyph.centerX*scale, -glyph.centerY*scale

    for i in [0...triangles.length] by 3
        p1 = triangles[i+0]
        p2 = triangles[i+1]
        p3 = triangles[i+2]
        console.log p1, p2, p3

        ctx.beginPath()
        ctx.moveTo(p1.x*scale, p1.y*scale)
        ctx.lineTo(p2.x*scale, p2.y*scale)
        ctx.lineTo(p3.x*scale, p3.y*scale)
        ctx.closePath()
        ctx.fill()
        
        ctx.beginPath()
        ctx.moveTo(p1.x*scale, p1.y*scale)
        ctx.lineTo(p2.x*scale, p2.y*scale)
        ctx.lineTo(p3.x*scale, p3.y*scale)
        ctx.closePath()
        ctx.stroke()
    
    ctx.restore()

    $('<label>Triangulate: </label>').appendTo(stats)
    $('<span></span>').text((end-start).toFixed(4)+'ms').appendTo(stats)

drawGlyph = (glyph, bezier=false) ->
    stats.empty()

    ctx.clearRect(0,0,canvas.width,canvas.height)

    start = performance.now()
    contours = for contour in glyph.contours
        if bezier then svgTessellate(contour)
        else contour
    end = performance.now()
    $('<label>Bezier Tessellate: </label>').appendTo(stats)
    $('<span></span>').text((end-start).toFixed(4)+'ms, ').appendTo(stats)

    drawTriangles glyph, contours
    drawOutline glyph, contours

$ ->
    canvas = $('canvas')[0]
    ctx = canvas.getContext('2d')
    font = null

    controls = $('<div></div>').insertBefore(canvas)
    $('<label>Glyph: </label>').appendTo(controls)
    select = $('<select></select>').appendTo(controls)
    $('<label>Bezier: </label>').appendTo(controls)
    bezierCheckbox = $('<input type="checkbox" checked="checked"></input>').appendTo(controls)
    go = $('<button>Go</button>').appendTo(controls).click ->
        glyphNum = parseInt(select.val(), 10)
        doBezier = bezierCheckbox[0].checked
        glyph = font.tables.glyf.glyphs[glyphNum]
        drawGlyph glyph, doBezier

    stats = $('<div></div>').insertAfter(controls)

    loadBuffer path:'fonts/leaguegothic-regular-webfont.ttf', load: (buffer) ->
        font = new TTF buffer
        for glyph, i in font.tables.glyf.glyphs
            $('<option></option>')
                .text(i)
                .val(i)
                .appendTo(select)
