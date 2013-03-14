exports = class BufferStream
    constructor: (@buffer, @pos=0, @view=null) ->
        @start = @pos
        if @view == null
            @view = new DataView(@buffer)

    getPos: ->
        return @pos - @start

    seek: (pos) ->
        @pos = @start + pos
        return @

    seekRel: (offset) ->
        @pos += offset
        return @

    int: ->
        value = @view.getInt32(@pos)
        @pos += 4
        return value
    
    float: ->
        value = @view.getFloat32(@pos)
        @pos += 4
        return value

    uint: ->
        value = @view.getUint32(@pos)
        @pos += 4
        return value

    uintArray: (count) ->
        result = new Uint32Array(count)
        for i in [0...count]
            result[i] = @uint()
        return result

    ulong: ->
        a = @uint()
        b = @uint()
        return a*(1<<32)+b
    
    short: ->
        value = @view.getInt16(@pos)
        @pos += 2
        return value
    
    ushort: ->
        value = @view.getUint16(@pos)
        @pos += 2
        return value

    fixed1616: ->
        return @int()/(1<<16)

    ushortArray: (count) ->
        result = new Uint16Array(count)
        for i in [0...count]
            result[i] = @ushort()
        return result

    byte: ->
        value = @view.getUint8(@pos)
        @pos += 1
        return value
    
    byteArray: (count) ->
        result = new Uint8Array(@buffer, @pos, count)
        @pos += count
        return result

    char: ->
        byte = @view.getUint8(@pos)
        value = String.fromCharCode(byte)
        @pos += 1
        return value

    string: (length) ->
        result = ''
        for i in [0...length]
            result += @char()
        return result

    stream: (offset) ->
        return new BufferStream(@buffer, offset, @view)
    
    streamRel: (offset) ->
        return new BufferStream(@buffer, offset+@pos, @view)

