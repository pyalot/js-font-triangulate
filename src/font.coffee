### useful specifications
    https://developer.apple.com/fonts/TTRefMan/RM06/Chap6.html
    http://scripts.sil.org/cms/scripts/page.php?item_id=IWS-Chapter08
###

BufferStream = require 'buffer-stream'

tableTypes =
    head: class
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

    glyf: class
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

                @width = @xmax - @xmin
                @height = @ymax - @ymin
                @centerX = (@xmax + @xmin)/2
                @centerY = (@ymax + @ymin)/2

                @contourEndPoints = @stream.ushorts contourCount

                instructionCount = @stream.ushort()
                if instructionCount > 1024*4 #no idea what's wrong here, data after this is garbage
                    console.warn 'Malformed Font, instructionCount too large: ' + instructionCount
                    @contours = []
                    return

                @instructions = @stream.bytes instructionCount

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

    loca: class
        constructor: (@stream, @tables) ->
        parse: ->
            if @tables.head.locaFormat == 0
                @offsets = (@stream.ushort()*2 for i in [0...@tables.maxp.numGlyfs-1])
            else
                @offsets = @stream.uints(@tables.maxp.numGlyfs-2)

    maxp: class
        constructor: (@stream) ->
            version = @stream.uint()
            if version != 0x00010000
                throw 'Unknown Maxp version'
            @numGlyfs = @stream.ushort()

    cmap: class
        constructor: (@stream, @tables) ->
            version = @stream.ushort()
            if version != 0
                throw 'cmap invalid version: ' + version

            tableCount = @stream.ushort()
            found = false
            for i in [0...tableCount]
                platformId = @stream.ushort()
                encodingId = @stream.ushort()
                offset = @stream.uint()
                if platformId == 3 and encodingId == 1
                    found = true
                    break

            if found
                @stream.seek offset
                version = @stream.ushort()
                if version != 4
                    throw 'Invalid cmap version: ' + version
                #@parseTable()
            else
                throw 'No cmap table found for windows/unicode'

        parse: ->
            length = @stream.ushort()
            language = @stream.ushort()
            segCount = @stream.ushort()/2
            searchRange = @stream.ushort()
            entrySelector = @stream.ushort()
            rangeShift = @stream.ushort()
            endCodes = @stream.ushorts(segCount)
            if endCodes[endCodes.length-1] != 0xffff
                throw 'Invalid end code table'
            reservedPad = @stream.ushort()
            if reservedPad != 0
                throw 'reservedPad was not 0'
            startCodes = @stream.ushorts(segCount)
            idDeltas = @stream.ushorts(segCount)
            idOffsetsAddress = @stream.getPos()
            idOffsets = @stream.ushorts(segCount)

            @char2glyph = {}
            @chars = []
            for startCode, segmentIdx in startCodes
                idDelta = idDeltas[segmentIdx]
                endCode = endCodes[segmentIdx]
                offset = idOffsets[segmentIdx]

                if endCode == 0xffff
                    break

                for charCode  in [startCode..endCode]
                    if offset == 0
                        glyphIdx = (charCode + idDelta) % 65536
                    else
                        idOffset = offset + (charCode-startCode)*2 + idOffsetsAddress + segmentIdx*2
                        glyphIdx = @stream.seek(idOffset).ushort()

                    char = String.fromCharCode charCode
                    glyph = @tables.glyf.glyphs[glyphIdx]
                    if glyph isnt undefined
                        @chars.push char
                        @char2glyph[char] = glyph
    hhea: class
        constructor: (@stream) ->
            version = @stream.uint()
            if version != 0x00010000
                throw 'Wrong HHEA version: ' + version
            @ascent = @stream.short()
            @descent = @stream.short()
            @lineGap = @stream.short()
            @advanceWidthMax = @stream.ushort()
            @minLeftSideBearing = @stream.short()
            @minRightSideBearing = @stream.short()
            @xMaxExtent = @stream.short()
            @carretSlopeRise = @stream.short()
            @carretSlopeRun = @stream.short()
            @carretOffset = @stream.short()
            reserved = @stream.shorts(4)
            dataFormat = @stream.short()
            if dataFormat != 0
                throw 'Wrong HHEA metric data format'
            @metricCount = @stream.ushort()
    
    hmtx: class
        constructor: (@stream, @tables) ->
        parse: ->
            @metrics = for i in [0...@tables.hhea.metricCount]
                {advance: @stream.ushort(), bearing: @stream.short()}
            #TODO handle monospace

    vhea: class
        constructor: (@stream) ->
            version = @stream.uint()
            if version != 0x00010000
                throw 'Wrong HHEA version: ' + version
            @ascent = @stream.short()
            @descent = @stream.short()
            @lineGap = @stream.short()
            @minTopSideBearing = @stream.short()
            @minBottomSideBearing = @stream.short()
            @yMaxExtent = @stream.short()
            @carretSlopeRise = @stream.short()
            @carretSlopeRun = @stream.short()
            @carretOffset = @stream.short()
            reserved = @stream.shorts(4)
            dataFormat = @stream.short()
            if dataFormat != 0
                throw 'Wrong HHEA metric data format'
            @metricCount = @stream.ushort()
            console.log @metricCount
    
    vmtx: class
        constructor: (@stream, @tables) ->
        parse: ->
            @metrics = for i in [0...@tables.vhea.metricCount]
                {advance: @stream.ushort(), bearing: @stream.short()}
            #TODO handle monospace
    
    kern: class
        constructor: (@stream) ->
            version = @stream.uint()
            if version == 0x00010000
                numTables = @stream.uint()
            else
                @stream.seek(0)
                version = @stream.ushort()
                numTables = @stream.ushort()
                if version != 0
                    throw 'incompatible kern format'

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
        @tables.cmap.parse()
        if @tables.hhea
            @tables.hmtx.parse()
        if @tables.vhea
            @tables.vmtx.parse()

    chars: -> @tables.cmap.chars
    getGlyph: (char) -> @tables.cmap.char2glyph[char]
