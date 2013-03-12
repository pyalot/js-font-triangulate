from marshal import loads, dumps
from os import walk, stat
from os.path import exists, join, realpath, dirname, splitext, basename
from stat import ST_MTIME
from subprocess import Popen, PIPE
from datetime import datetime
from sys import argv, stdout

try:
    import json
    jsonEncode = json.dumps
except ImportError:
    try:
        import cjson
        jsonEncode = cjson.encode
    except ImportError:
        try:
            import simplejson
            jsonEncode = simplejson.dumps
        except ImportError:
            sys.exit(-1)

class CoffeeError(Exception): pass

message_count = 0
def message(text):
    global message_count
    now = datetime.now().strftime('%H:%M:%S')
    print '[%04i %s] %s' % (message_count, now, text)
    message_count+=1

def error(text):
    stdout.write('\x1b[31m%s\x1b[39m' % text)
    stdout.flush()

def modified(path):
    return stat(path)[ST_MTIME]

def suffix(items, suffix):
    result = []
    for item in items:
        if item.endswith(suffix):
            result.append(item)
    return result

def files(directory):
    result = []
    for root, dirs, files in walk(directory):
        for file in files:
            result.append(join(root, file))
    return result

def preprocess(source, name):
    result = []
    for lineno, line in enumerate(source.split('\n')):
        line = line.replace('//essl', '#line %i %s' % (lineno+1, basename(name)))
        result.append(line)
    return '\n'.join(result)

def wrap(source, moduleName):
    source = '\n'.join(['    ' + line for line in source.split('\n')])
    return "define '%s', (exports) ->\n%s\n    return exports" % (moduleName, source)

def coffee_compile(srcName, dstName, moduleName):
    message('compiling: %s' % srcName)
    source = open(srcName).read()
    source = preprocess(source, moduleName)
    source = wrap(source, moduleName)
    command = ['coffee', '--stdio', '--print', '--bare']
    process = Popen(command, stdin=PIPE, stdout=PIPE, stderr=PIPE)
    out, err = process.communicate(source)
    if process.returncode:
        error(err)
        raise CoffeeError(err)
    else:
        outfile = open(dstName, 'w')
        outfile.write(out)
        outfile.close()

if __name__ == '__main__':
    __dir__ = dirname(realpath(__file__))
    src = join(__dir__, 'src')
    lib = join(__dir__, 'lib')

    try:
        for srcFile in set(suffix(files(src), '.coffee')):
            dstFile = join(lib, srcFile[len(src)+1:]).replace('.coffee', '.js')
            if not exists(dstFile) or modified(srcFile) > modified(dstFile):
                moduleName = basename(srcFile).replace('.coffee', '')
                coffee_compile(srcFile, dstFile, moduleName)

        code = []
        for file in files(lib):
            if 'code.js' not in file:
                code.append(open(file).read())
        code = '\n'.join(code)
        open(join(lib, 'code.js'), 'w').write(code)
    except CoffeeError: pass
