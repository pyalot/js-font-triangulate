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
    
    update = ->
        char = glyphSelect.val()
        glyph = font.getGlyph(char)
        doBezier = bezierCheckbox[0].checked
        drawGlyph glyph, doBezier
    
    fonts = [
        '3dlet.ttf'
        'AtomicClockRadio.ttf'
        'BORON2.ttf'
        'BaroqueScript.ttf'
        'CarbonPhyber.ttf'
        'DOldModern.ttf'
        'FACTOR2.ttf'
        'Hawaii_Killer.ttf'
        'TypewriterFromHell.ttf'
        'TypewriterKeys.ttf'
        'VTKSAnimal2.ttf'
        'fanwood-webfont.ttf'
        'leaguegothic-regular-webfont.ttf'
        'orbitron-black-webfont.ttf'
        'orbitron-medium-webfont.ttf'
    ]
    
    loadFont = ->
        name = fontSelect.val()
        loadBuffer path: 'fonts/' + name, load: (buffer) ->
            glyphSelect.empty()
            font = new TTF buffer
            
            for char in font.chars()
                option = $('<option></option>')
                    .text(char)
                    .val(char)
                    .appendTo(glyphSelect)

                if char == 'A'
                    option.attr('selected', 'selected')

            update()

    controls = $('<div></div>').insertBefore(canvas)
    $('<label>Font: </label>').appendTo(controls)
    fontSelect = $('<select></select>').appendTo(controls).change loadFont
    for font in fonts
        $('<option></option>')
            .text(font)
            .val(font)
            .appendTo(fontSelect)

    $('<label>Glyph: </label>').appendTo(controls)
    glyphSelect = $('<select></select>').appendTo(controls).change update
    $('<label>Bezier: </label>').appendTo(controls)
    bezierCheckbox = $('<input type="checkbox" checked="checked"></input>').appendTo(controls).change update

    stats = $('<div></div>').insertAfter(controls)
    loadFont()
