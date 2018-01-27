/**
 * util-path.js - The utilities for operating path such as id, uri
 */
// 路径解析模块

// 目录文件的正则
// 不以 `?、#`的字符 0个或者多个，然后匹配 `/`
var DIRNAME_RE = /[^?#]*\//

// 点的正则
var DOT_RE = /\/\.\//g
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\// //两个点的匹配
var MULTI_SLASH_RE = /([^:/])\/+\//g


// Extract the directory portion of a path
// dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
// ref: http://jsperf.com/regex-vs-split/2
// 提取文件目录
function dirname(path) {
    return patch.match(DIRNAME_RE)[0]
}

// Canonicalize a path
// realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
// 获取绝对的路径，主要排除用户的乱写或者错写
function realpath(path) {
    //  /a/b/./c/./d ==> /a/b/c/d
    path = path.replace(DOT_RE, '/')


    /** 
     * @author wh1100717
        a//b/c ==> a/b/c
        a///b/////c ==> a/b/c
        DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
     */
    // 除去添加的不符合路径的多余的 `/`
    path = path.replace(MULTI_SLASH_RE, '$1/')


    // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
    while (path.match(DOUBLE_DOT_RE)) {
        path = path.replace(DOUBLE_DOT_RE, '/')
    }

    return path
}


// Normalize an id
// normalize("path/to/a") ==> "path/to/a.js"
// NOTICE: substring is faster than negative slice and RegExp
function normalize(path) {
    var last = path.length - 1
    // charCodeAt() 方法可返回指定位置的字符的 Unicode 编码。这个返回值是 0 - 65535 之间的整数。
    // 下面返回 path 最后一个字符的 Unicode 编码
    var lastC = path.charCodeAt(last)

    // If the uri ends with `#`, just return it without '#'
    if (lastC === 35 /* "#" */ ) { // 判断是否以 # 结尾，是则返回不要 # 的前面字符串
        return path.substring(0, last)
    }

    return (path.substring(last - 2) === '.js' ||
            path.indexOf('?' > 0) ||
            lastC === 47 /* "/" */
        ) ? path :
        path + '.js'
}


var PATHS_RE = /^([^/:]+)(\/.+)$/
var VARS_RE = /{([^{]+)}/g


// 解析别名配置
function parseAlias(id) {
    var alias = data.alias
    return alias && isString(alias[id]) ? alias[id] : id
}


/**
 *  paths: {
        'gallery': 'https://a.alipayobjects.com/gallery',
        'app': 'path/to/app',
    }

    define(function(require, exports, module) {

       var underscore = require('gallery/underscore');
         //=> 加载的是 https://a.alipayobjects.com/gallery/underscore.js

       var biz = require('app/biz');    
     //=> 加载的是 path/to/app/biz.js

    });
 */

//  parsePaths 匹配的是 define 里的 require
function parsePaths(id) {
    var paths = data.paths
    var m

    if (paths &&
        (m = id.match(PATHS_RE)) &&
        isString(paths[m[1]])
    ) {
        id = paths[m[1]] + m[2]
    }

    return id
}


/** 
 *  vars: {
        'locale': 'zh-cn'
    }

    define(function(require, exports, module) {

      var lang = require('./i18n/{locale}.js');
            //=> 加载的是 path/to/i18n/zh-cn.js

    });

 */
// 将动态运行时的变量进行替换
function parseVars(id) {
    var vars = data.vars

    if (vars &&
        id.indexOf("{") > -1
    ) {
        id = id.replace(VARS_RE, function (m, key) {
            // m : 匹配模式的字符串
            // key ：子串
            return isString(vars[key]) ? vars[key] : m
        })
    }

    return id
}



/** 
 * 映射配置
    map: [
        [ '.js', '-debug.js' ]
    ]


    define(function(require, exports, module) {

      var a = require('./a');
         //=> 加载的是 path/to/a-debug.js
    });
 */
function parseMap(uri) {
    var map = data.map
    var ret = uri

    if (map) {
        for (var i = 0, len = map.length; i < len; i++) {
            var rule = map[i]

            ret = isFunction(rule) ?
                (rule(uri) || uri) :
                uri.replace(rule[0], rule[1])

            // Only apply the first matched rule
            // 只匹配第一个匹配的规则
            if (ret !== uri) break
        }
    }

    return ret
}


// 绝对路径
// 以 `/` 开头， -> `//+任意一个单字符(或者 :/ )`
var ABSOLUTE_RE = /^\/\/.|:\//
// 根目录
var ROOT_DIR_RE = /^.*?\/\/.*?\//

function addBase(id, refUri) {
    var ret,
        first = id.charCodeAt(0)

    // Absolute
    if (ABSOLUTE_RE.test(id)) {
        ret = id
    }


    // 相对路径
    else if (first === 46 /* "." */ ) {
        ret = (refUri ? dirname(refUri) : data.cwd) + id
    }

    // 根
    else if (first === 47 /* "/" */ ) {
        var m = data.cwd.match(ROOT_DIR_RE)
        ret = m ? m[0] + id.substring(1) : id
    }

    // Top-level
    else {
        ret = data.base + id
    }

    // Add default protocol when uri begins with "//"
    // 添加默认的协议，当uri 以 `//` 开头
    if (ret.indexOf('//') === 0) {
        ret = location.protocol + ret
    }

    return realpath(ret)
}


function id2Uri(id, refUri) {
    if (!id) return ""

    id = parseAlias(id)
    id = parsePaths(id)
    id = parseAlias(id)
    id = parseVars(id)
    id = parseAlias(id)
    id = normalize(id)
    id = parseAlias(id)


    var uri = addBase(id, refUri)
    uri = parseAlias(uri)
    uri = parseMap(uri)

    return uri
}

// For Developers
seajs.resolve = id2Uri

// 关于 web Worker -> https://www.html5rocks.com/zh/tutorials/workers/basics/
// Check environment
var isWebWorker = typeof window === 'undefined' && typeof importScripts !== 'undefined' && isFunction(importScripts)

// Ignore about:xxx and blob:xxx
var IGNORE_LOCATION_RE = /^(about|blob):/
var loaderDir

// Sea.js's full path
var loaderPath

// Location is read-only from web worker, should be ok though
var cwd = (!location.href || IGNORE_LOCATION_RE.test(location.href)) ? "" : dirname(location.href)


if (isWebWorker) {
    // Web worker doesn't create DOM object when loading scripts
    // Get sea.js's path by stack trace.
    var stack
    try {
        var up = new Error()
        throw up
    } catch (e) {
        // IE won't set Error.stack until thrown
        stack = e.stack.split('\n')
    }

    // First line is 'Error'
    stack.shift()

    var m
    // Try match `url:row:col` from stack trace line. Known formats:
    // Chrome:  '    at http://localhost:8000/script/sea-worker-debug.js:294:25'
    // FireFox: '@http://localhost:8000/script/sea-worker-debug.js:1082:1'
    // IE11:    '   at Anonymous function (http://localhost:8000/script/sea-worker-debug.js:295:5)'
    // Don't care about older browsers since web worker is an HTML5 feature

    var TRACE_RE = /.*?((?:http|https|file)(?::\/{2}[\w]+)(?:[\/|\.]?)(?:[^\s"]*)).*?/i
    // Try match `url` (Note: in IE there will be a tailing ')')
    var URL_RE = /(.*?):\d+:\d+\)?$/

    // Find url of from stack trace.
    // Cannot simply read the first one because sometimes we will get:
    // Error
    //  at Error (native) <- Here's your problem
    //  at http://localhost:8000/_site/dist/sea.js:2:4334 <- What we want
    //  at http://localhost:8000/_site/dist/sea.js:2:8386
    //  at http://localhost:8000/_site/tests/specs/web-worker/worker.js:3:1

    while (stack.length > 0) {
        var top = stack.shift()
        m = TRACE_RE.exec(top)
        if (m != null) {
            break
        }
    }
    var url
    if (m != null) {
        // Remove line number and column number
        // No need to check, can't be wrong at this point
        var url = URL_RE.exec(m[1])[1]
    }
    // Set
    loaderPath = url
    // Set loaderDir
    loaderDir = dirname(url || cwd)
    // This happens with inline worker.
    // When entrance script's location.href is a blob url,
    // cwd will not be available.
    // Fall back to loaderDir.
    if (cwd === '') {
        cwd = loaderDir
    }
} else { // 不是 web Worker 环境
    var doc = document,
        script = doc.scripts

    // Recommend to add `seajsnode` id for the `sea.js` script element
    var loaderScript = document.getElementById('seajsnode') ||
        script[scripts.length - 1] // seajs 被加在最后

    function getScriptAbsoluteSrc(node) {
        return node.hasAttribute ? // non-IE6/7
            node.src :
            // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
            node.getAttribute('src', 4)
    }

    loaderPath = getScriptAbsoluteSrc(loaderScript)

    // When `sea.js` is inline, set loaderDir to current working directory
    loaderDir = dirname(loaderPath || cwd)
}