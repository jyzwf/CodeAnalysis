/**
 * util-deps.js - The parser for dependencies
 * ref: tests/research/parse-dependencies/test.html
 * ref: https://github.com/seajs/crequire
 */

//  Module.define = function (id, deps, factory) 
// parseDependencies(factory.toString()
/**
 * define(function(require, exports, module) {

       var $ = require('jquery');
         //=> 加载的是 http://path/to/base/jquery/jquery/1.10.1/jquery.js

       var biz = require('app/biz');
         //=> 加载的是 http://path/to/app/biz.js

    });
  */

//   形如上面的定义，parseDependencies(s) 就是将 define 里面的函数进行字符串化，
// 然后解析里面的 `require`关键字，收集依赖
function parseDependencies(s) {
    // 找不到依赖
    if (s.indexOf('require') == -1) {
        return []
    }
    var index = 0,
        peek,
        length = s.length, // 字符串的总长度
        isReg = 1,
        modName = 0,
        res = []

    var parentheseState = 0,
        parentheseStack = []

    var braceState,
        braceStack = [],
        isReturn

    while (index < length) {
        readch() // 获取当前字符，并赋值给 peek 
        if (isBlank()) {
            if (isReturn && (peek == '\n' || peek == '\r')) {
                braceState = 0
                isReturn = 0
            }
        } else if (isQuote()) {
            dealQuote()
            isReg = 1
            isReturn = 0
            braceState = 0
        } else if (peek == '/') { // 注释匹配
            readch()
            if (peek == '/') { // 匹配 // xxx
                index = s.indexOf('\n', index)
                if (index == -1) {
                    index = s.length
                }
            } else if (peek == '*') { // 匹配 /* ... */
                var i = s.indexOf('\n', index)
                index = s.indexOf('*/', index)
                if (index == -1) {
                    index = length
                } else {
                    index += 2
                }
                if (isReturn && i != -1 && i < index) {
                    braceState = 0
                    isReturn = 0
                }
            } else if (isReg) { // 是正则
                dealReg()
                isReg = 0
                isReturn = 0
                braceState = 0
            } else {
                index--
                isReg = 1
                isReturn = 0
                braceState = 1
            }
        } else if (isWord()) {
            dealWord()
        } else if (isNumber()) {
            dealNumber()
            isReturn = 0
            braceState = 0
        } else if (peek == '(') {
            parentheseStack.push(parentheseState)
            isReg = 1
            isReturn = 0
            braceState = 1
        } else if (peek == ')') {
            isReg = parentheseStack.pop()
            isReturn = 0
            braceState = 0
        } else if (peek == '{') {
            if (isReturn) {
                braceState = 1
            }
            braceStack.push(braceState)
            isReturn = 0
            isReg = 1
        } else if (peek == '}') {
            braceState = braceStack.pop()
            isReg = !braceState
            isReturn = 0
        } else {
            var next = s.charAt(index)
            if (peek == ';') {
                braceState = 0
            } else if (peek == '-' && next == '-' ||
                peek == '+' && next == '+' ||
                peek == '=' && next == '>') {
                braceState = 0
                index++
            } else {
                braceState = 1
            }
            isReg = peek != ']'
            isReturn = 0
        }
    }
    return res

    // 返回当前字符
    function readch() {
        peek = s.charAt(index++)
    }

    // 判断当前字符是否为空
    function isBlank() {
        return /\s/.test(peek)
    }

    // 判断当前字符是否为 引号
    function isQuote() {
        return peek == '"' || peek == "'"
    }

    // 引号处理函数
    function dealQuote() {
        var start = index // 当前字符的索引
        var c = peek // 当前字符
        var end = s.indexOf(c, start) // 从当前字符索引开始向后查找 当前匹配的 引号
        if (end == -1) { // 找不到
            index = length // 直接终止循环
        } else if (s.charAt(end - 1) != '\\') { // ？？？？？？？？？？？？？？？？？？？？？？？？？？
            index = end + 1
        } else {
            while (index < length) {
                readch()
                if (peek == '\\') {
                    index++
                } else if (peek == c) {
                    break
                }
            }
        }
        if (modName) {
            //maybe substring is faster  than slice .
            res.push(s.substring(start, index - 1))
            modName = 0
        }
    }

    function dealReg() {
        index--
        while (index < length) {
            readch()
            if (peek == '\\') {
                index++
            } else if (peek == '/') {
                break
            } else if (peek == '[') {
                while (index < length) {
                    readch()
                    if (peek == '\\') {
                        index++
                    } else if (peek == ']') {
                        break
                    }
                }
            }
        }
    }

    // 当前字符是否是 a-z/_/$ 这里面的字符
    function isWord() {
        return /[a-z_$]/i.test(peek)
    }

    function dealWord() {
        // 获取从当前字符开始的后面剩余字符
        var s2 = s.slice(index - 1)
        var r = /^[\w$]+/.exec(s2)[0] // 以 A-Za-z0-9_$开头的一个或者多个字符
        parentheseState = {
            'if': 1,
            'for': 1,
            'while': 1,
            'with': 1
        }[r]
        isReg = {
            'break': 1,
            'case': 1,
            'continue': 1,
            'debugger': 1,
            'delete': 1,
            'do': 1,
            'else': 1,
            'false': 1,
            'if': 1,
            'in': 1,
            'instanceof': 1,
            'return': 1,
            'typeof': 1,
            'void': 1
        }[r]
        isReturn = r == 'return'
        braceState = {
            'instanceof': 1,
            'delete': 1,
            'void': 1,
            'typeof': 1,
            'return': 1
        }.hasOwnProperty(r)
        modName = /^require\s*(?:\/\*[\s\S]*?\*\/\s*)?\(\s*(['"]).+?\1\s*[),]/.test(s2)
        if (modName) {
            r = /^require\s*(?:\/\*[\s\S]*?\*\/\s*)?\(\s*['"]/.exec(s2)[0]
            index += r.length - 2
        } else {
            index += /^[\w$]+(?:\s*\.\s*[\w$]+)*/.exec(s2)[0].length - 1
        }
    }

    // 是否是数字
    function isNumber() {
        return /\d/.test(peek) ||
            peek == '.' && /\d/.test(s.charAt(index))
    }

    function dealNumber() {
        var s2 = s.slice(index - 1)
        var r
        if (peek == '.') {
            r = /^\.\d+(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
        } else if (/^0x[\da-f]*/i.test(s2)) {
            r = /^0x[\da-f]*\s*/i.exec(s2)[0]
        } else {
            r = /^\d+\.?\d*(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
        }
        index += r.length - 1
        isReg = 0
    }
}