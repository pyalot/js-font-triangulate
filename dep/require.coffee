modules = {}
window.define = (name, code) ->
    modules[name] = {
        code: code
        instance: null
    }

window.require = (name) ->
    module = modules[name]
    if module == undefined
        throw 'Module not found: ' + name

    if module.instance == null
        exports = {}
        exports = module.code(exports)
        module.instance = exports
    return exports
