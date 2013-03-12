BufferStream = require 'buffer-stream'

tableTypes =
    head: class Head
        constructor: (@stream) ->
            @version = @stream.fixed1616()
            @revision = @stream.fixed1616()
            checkSumAdjustment = @stream.uint()
            magic = @stream.uint()
            if magic != 0x5f0f3cf5
                throw 'ttf magic did not match'
            @flags = @stream.ushort()
            @unitsPerEm = @stream.ushort()

            @created = @stream.ulong()
            @modified = @stream.ulong()
                
            @xmin = @stream.short()/@unitsPerEm
            @ymin = @stream.short()/@unitsPerEm
            @xmax = @stream.short()/@unitsPerEm
            @ymax = @stream.short()/@unitsPerEm

            @style = @stream.ushort()
            @smallestReadablePixelSize = @stream.ushort()
            @directionHint = @stream.short()
            @locaFormat = @stream.short()
            @glyphFormat = @stream.short()

            if @glyphFormat != 0
                throw 'Unknown Glyph Format'

    glyf: class Glyf
        class Glyph
            constructor: (@tables, @stream) ->
                @unitsPerEm = @tables.head.unitsPerEm

                contourCount = @stream.short()
                if contourCount == -1 #compound glyph, not yet parsed
                    @contours = []
                    return

                @xmin = @stream.short()/@unitsPerEm
                @ymin = @stream.short()/@unitsPerEm
                @xmax = @stream.short()/@unitsPerEm
                @ymax = @stream.short()/@unitsPerEm

                if @xmin >= @xmax or @ymin >= @ymax
                    console.warn 'Glyph bounding box not correct'

                @width = @xmax - @xmin
                @height = @ymax - @ymin
                @centerX = (@xmax + @xmin)/2
                @centerY = (@ymax + @ymin)/2

                @contourEndPoints = @stream.ushortArray contourCount


                instructionCount = @stream.ushort()
                if instructionCount > 1024*4 #no idea what's wrong here, data after this is garbage
                    console.warn 'Malformed Font, instructionCount too large: ' + instructionCount
                    @contours = []
                    return

                @instructions = @stream.byteArray instructionCount

                @coordinatesCount = @contourEndPoints[@contourEndPoints.length - 1]
                @flags = []
                while @flags.length <= @coordinatesCount
                    flag = @stream.byte()
                    @flags.push flag
                    if (flag & 1<<3) > 0
                        repeat = @stream.byte()
                        for _ in [0...repeat]
                            @flags.push flag

                @coords = for flag in @flags
                    {onCurve: (flag & 1<<0)>0}

                @addCoords 1, 4, 'x'
                @addCoords 2, 5, 'y'

                @readPath()
            
            addCoords: (isByteBit, sameBit, name) ->
                value = 0
                for flag, i in @flags
                    same = (flag & 1<<sameBit)>0
                    if (flag & 1<<isByteBit)>0
                        if same
                            value += @stream.byte()
                        else
                            value -= @stream.byte()
                    else if not same
                        value += @stream.short()

                    @coords[i][name] = value/@unitsPerEm
                return

            readPath: ->
                @contours = []
                contours = []

                start = 0
                for end in @contourEndPoints
                    coords = @coords[start...end+1]
                    while coords[0].onCurve == false and coords[1].onCurve == true
                        coords.push coords.shift()
                    contours.push coords
                    start = end+1

                for coords in contours
                    path = []
                    @contours.push path
                    i = 0
                    while i < coords.length
                        c1 = coords[(i+0)%coords.length]
                        c2 = coords[(i+1)%coords.length]
                        if c1.onCurve
                            if c2.onCurve
                                i += 1
                                path.push name:'line', from:{x:c1.x, y:c1.y}, to:{x:c2.x, y:c2.y}
                            else
                                c3 = coords[(i+2)%coords.length]
                                if c3.onCurve
                                    i += 2
                                    path.push name:'bezier', from:{x:c1.x, y:c1.y}, control:{x:c2.x, y:c2.y}, to:{x:c3.x, y:c3.y}
                                else
                                    i += 1
                                    xm=(c2.x+c3.x)/2; ym=(c2.y+c3.y)/2
                                    path.push name:'bezier', from:{x:c1.x, y:c1.y}, control:{x:c2.x, y:c2.y}, to:{x:xm, y:ym}
                        else
                            if c2.onCurve
                                throw 'wtf?'
                            else
                                c3 = coords[(i+2)%coords.length]
                                if c3.onCurve
                                    i += 2
                                    xm=(c1.x+c2.x)/2; ym=(c1.y+c2.y)/2
                                    path.push name:'bezier', from:{x:xm, y:ym}, control:{x:c2.x, y:c2.y}, to:{x:c3.x, y:c3.y}
                                else
                                    i += 1
                                    xm1=(c1.x+c2.x)/2; ym1=(c1.y+c2.y)/2
                                    xm2=(c2.x+c3.x)/2; ym2=(c2.y+c3.y)/2
                                    path.push name:'bezier', from:{x:xm1, y:ym1}, control:{x:c2.x, y:c2.y}, to:{x:xm2, y:ym2}

                if @contours.length == 1 and @contours[0].length == 0
                    @contours = []

        constructor: (@stream, @tables) ->
        parse: ->
            @glyphs = for offset in @tables.loca.offsets
                new Glyph @tables, @stream.streamRel offset

    loca: class Loca
        constructor: (@stream, @tables) ->
        parse: ->
            if @tables.head.locaFormat == 0
                @offsets = (@stream.ushort()*2 for i in [0...@tables.maxp.numGlyfs])
            else
                @offsets = (@stream.uint() for i in [0...@tables.maxp.numGlyfs])

    maxp: class Maxp
        constructor: (@stream) ->
            version = @stream.uint()
            if version != 0x00010000
                throw 'Unknown Maxp version'
            @numGlyfs = @stream.ushort()

exports = class TTF
    constructor: (@buffer) ->
        @stream = new BufferStream @buffer

        type = @stream.uint()
        if type == 0x00010000
            @type = 'truetype'
        else if @version == 0x4f54544f
            @type = 'opentype'
        else
            @type = 'UNKNOWN'

        console.log 'Font Type: ', @type

        tableCount = @stream.ushort()
        @stream.seek(12)
        @tables = {}

        for i in [0...tableCount]
            name = @stream.string(4)
            checkSum = @stream.uint()
            offset = @stream.uint()
            length = @stream.uint()
            cls = tableTypes[name]
            if cls?
                @tables[name] = new cls @stream.stream(offset), @tables

        @tables.loca.parse()
        @tables.glyf.parse()
