exports = class BufferStream
    constructor: (@buffer, @pos=0) ->
        @view = new DataView(@buffer)

    seek: (@pos) -> @
    seekRel: (offset) -> @pos += offset

    int: (value) ->
        if value? then @view.setInt32(@pos, value)
        else value = @view.getInt32(@pos)
        @pos += 4
        return value
    
    float: (value) ->
        if value? then @view.setFloat32(@pos, value)
        else value = @view.getFloat32(@pos)
        @pos += 4
        return value

    uint: (value) ->
        if value? then @view.setUint32(@pos, value)
        else value = @view.getUint32(@pos)
        @pos += 4
        return value

    ulong: ->
        a = @uint()
        b = @uint()
        return a*(1<<32)+b
    
    short: (value) ->
        if value? then @view.setInt16(@pos, value)
        else value = @view.getInt16(@pos)
        @pos += 2
        return value
    
    ushort: (value) ->
        if value? then @view.setUint16(@pos, value)
        else value = @view.getUint16(@pos)
        @pos += 2
        return value

    fixed1616: ->
        return @int()/(1<<16)

    ushortArray: (count) ->
        result = []
        for _ in [0...count]
            result.push @ushort()
        return result

    byte: (value) ->
        if value? then @view.setUint8(@pos, value)
        else value = @view.getUint8(@pos)
        @pos += 1
        return value
    
    byteArray: (count) ->
        result = []
        for _ in [0...count]
            result.push @byte()
        return result

    char: (value) ->
        if value? then @view.setUint8(@pos, value.charCodeAt(0))
        else
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
        return new BufferStream(@buffer, offset)
    
    streamRel: (offset) ->
        return new BufferStream(@buffer, offset+@pos)

