/**
 * module.js - The core of module loader
 */

var cachedMods = seajs.cache = {}
var anonymousMeta

var fetchingList = {},
    fetchedList = {},
    callbackList = {}

var STATUS = Module.STATUS = {
    // 1 - The `module.uri` is being fetched
    FETCHING: 1,
    // 2 - The meta data has been saved to cachedMods
    SAVED: 2,
    // 3 - The `module.dependencies` are being loaded
    LOADING: 3,
    // 4 - The module are ready to execute
    LOADED: 4,
    // 5 - The module is being executed
    EXECUTING: 5,
    // 6 - The `module.exports` is available
    EXECUTED: 6,
    // 7 - 404
    ERROR: 7
}


function Module(uri, deps) {
    this.uri = uri
    this.dependencies = deps || [] // 存的只是依赖的模块的名字
    this.deps = {} // Ref the dependence modules -> 依赖模块的实例
    this.status = 0

    this._entry = [] // 初始化设置当前模块，pass方法执行后更新为被依赖模块，用于获取执行被依赖模块的回调函数
}

// Resolve module.dependencies
// 依赖路径解析
Module.prototype.resolve = function () {
    var mod = this
    var ids = mod.dependencies
    var uris = [] // 所有依赖模块的完整路径

    for (var i = 0, len = ids.length; i < len; i++) {
        uris[i] = Module.resolve(ids[i], mod.uri)
    }

    return uris
}

// 依赖模块的_entry属性更新为当前模块，即被依赖模块
// 意义是通过load方法调用onload方法，当依赖模块加载完成后，执行被依赖模块的回调函数
Module.prototype.pass = function () {
    var mod = this
    var len = mod.dependencies.length

    for (var i = 0; i < mod._entry.length; i++) {
        var entry = mod._entry[i] // 被依赖的模块
        var count = 0
        for (var j = 0; j < len; j++) {
            var m = mod.deps[mod.dependencies[j]] // 依赖模块的实例
            // If the module is unload and unused in the entry, pass entry to it
            // 依赖模块尚未加载，依赖模块的_entry属性添加当前模块，count计数加1
            if (m.status < STATUS.LOADED && !entry.history.hasOwnProperty(m.uri)) {
                entry.history[m.uri] = true
                count++
                // 子模块的_entry 中加入父模块的被依赖模块
                m._entry.push(entry)
                if (m.status === STATUS.LOADING) {
                    m.pass()
                }
            }
        }
        // If has passed the entry to it's dependencies, modify the entry's count and del it in the module
        if (count > 0) {
            entry.remain += count - 1 // 被依赖的模块尚未加载的依赖模块数量,
            mod._entry.shift()
            i--
        }
    }
}


// Load module.dependencies and fire onload when all done
Module.prototype.load = function () {
    var mod = this

    // If the module is being loaded, just wait it onload call
    // 该模块正在执行，就返回，防止重复执行
    if (mod.status >= STATUS.LOADING) {
        return
    }

    mod.status = STATUS.LOADING

    // Emit `load` event for plugins such as combo plugin
    // 所有依赖模块的完整路径
    var uris = mod.resolve()
    emit("load", uris)

    for (var i = 0, len = uris.length; i < len; i++) {
        // 每个依赖模块又是 Module 的实例
        // 创建依赖模块的实例
        mod.deps[mod.dependencies[i]] = Module.get(uris[i])
    }

    // Pass entry to it's dependencies
    // 依赖模块的_entry属性存储当前模块；通过load方法调用onload方法，当依赖模块加载完成后，执行被依赖模块的回调函数
    mod.pass()

    // If module has entries not be passed, call onload
    // pass方法执行完成后，mod._entry存储被依赖的模块；当前模块加载完成时，执行被依赖模块的回调函数
    // 执行时机为，当依赖模块加载完成后，onload事件发生时，调用该依赖模块的load方法，执行被依赖模块的回调
    if (mod._entry.length) {
        mod.onload()
        return
    }

    // Begin parallel loading
    // 缓存依赖模块的加载方法，内部调用seajs.request，创建script节点或执行importScripts函数
    var requestCache = {}
    var m

    for (i = 0; i < len; i++) {
        m = cachedMods[uris[i]]

        if (m.status < STATUS.FETCHING) {
            // 创建script节点，加载依赖模块的函数存入requestCache中，调用requestCache[requestUri]()正式加载依赖模块
            m.fetch(requestCache)
        } else if (m.status === STATUS.SAVED) {
            // define方法定义的模块通过script提前载入时，调用load方法执行被依赖模块的回调
            m.load()
        }
    }

    // Send all requests at last to avoid cache bug in IE6-9. Issues#808
    for (var requestUri in requestCache) {
        if (requestCache.hasOwnProperty(requestUri)) {
            requestCache[requestUri]()
        }
    }
}


// Call this method when module is loaded
// pass方法执行完成后，mod._entry存储依赖当前模块的模块，加载完成时执行所有被依赖模块的回调函数
// 并且mod.callback仅当模块使用seajs.use方法书写时存在
// define方法定义的模块，其回调函数存入mod.factory
Module.prototype.onload = function () {
    var mod = this
    mod.status = STATUS.LOADED

    // When sometimes cached in IE, exec will occur before onload, make sure len is an number
    for (var i = 0, len = (mod._entry || []).length; i < len; i++) {
        var entry = mod._entry[i]
        if (--entry.remain === 0) { // 执行被依赖模块的回调函数
            entry.callback()
        }
    }

    delete mod._entry
}


// Call this method when module is 404
Module.prototype.error = function () {
    var mod = this
    mod.onload()
    mod.status = STATUS.ERROR
}


// Execute a module
Module.prototype.exec = function () {
    var mod = this

    // When module is executed, DO NOT execute it again. When module
    // is being executed, just return `module.exports` too, for avoiding
    // circularly calling
    if (mod.status >= STATUS.EXECUTING) {
        return mod.exports
    }

    // 正在执行
    mod.status = STATUS.EXECUTING

    // _entry =[]，直接删除
    if (mod._entry && !mod._entry.length) {
        delete mod._entry
    }

    //non-cmd module has no property factory and exports
    // 不是cmd 模块没有 factory 和 exports 属性
    if (!mod.hasOwnProperty('factory')) {
        mod.non = true
        return
    }

    // Create require
    var uri = mod.uri

    function require(id) {
        // m：模块获取特定的依赖模块
        // 如果这个模块之前就有依赖过 id 所指模块，就直接取，否则新建一个模块
        var m = mod.deps[id] || Module.get(require.resolve(id))
        if (m.status == STATUS.ERROR) {
            throw new Error('module was broken: ' + m.uri)
        }
        // 如果这个模块的依赖模块还有依赖，就执行 ，一层一层执行
        return m.exec()
    }

    // 获取完整路径
    require.resolve = function (id) {
        return Module.resolve(id, uri)
    }

    // 异步
    require.async = function (ids, callback) {
        Module.use(ids, callback, uri + "_async_" + cid())
        return require
    }

    // Exec factory
    var factory = mod.factory

    /* define(function (require, exports, module) {  // factory

        // 模块代码

    }); */

    // 执行factory 函数，并且以特定的三个参数传入 -> require, mod.exports={}, mod
    // https://github.com/seajs/seajs/issues/242 exports 和 module.exports 区别
    var exports = isFunction(factory) ?
        factory.call(mod.exports = {}, require, mod.exports, mod) :
        // factory 是 字符串或者对象的时候，表示模块的接口就是该对象、字符串
        // define({ "foo": "bar" });
        // define('I am a template. My name is {{name}}.');
        factory

    if (exports === undefined) { // 如果函数没有返回值
        exports = mod.exports // 直接暴露 该模块的 exports 对象
    }

    // Reduce memory leak
    // 删除该 模块的 factory ，防止内存泄漏
    delete mod.factory

    mod.exports = exports // 更新 mod.exports
    mod.status = STATUS.EXECUTED

    // Emit `exec` event
    // 执行 'exec' 事件 ，并以该模块为参数
    emit("exec", mod)

    return mod.exports
}


// Fetch a module
// 创建script节点或importScripts函数加载模块；模块加载完成后调用load方法，执行被依赖模块的回调函数
Module.prototype.fetch = function (requestCache) {
    var mod = this
    var uri = mod.uri

    mod.status = STATUS.FETCHING

    // Emit `fetch` event for plugins such as combo plugin
    var emitData = {
        uri: uri
    }
    emit("fetch", emitData)
    var requestUri = emitData.requestUri || uri

    // Empty uri or a non-CMD module
    if (!requestUri || fetchedList.hasOwnProperty(requestUri)) {
        mod.load()
        return
    }

    if (fetchingList.hasOwnProperty(requestUri)) {
        callbackList[requestUri].push(mod)
        return
    }

    fetchingList[requestUri] = true
    callbackList[requestUri] = [mod]

    // Emit `request` event for plugins such as text plugin
    emit("request", emitData = {
        uri: uri,
        requestUri: requestUri,
        onRequest: onRequest,
        charset: isFunction(data.charset) ? data.charset(requestUri) : data.charset,
        crossorigin: isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
    })

    if (!emitData.requested) {
        requestCache ?
            requestCache[emitData.requestUri] = sendRequest :
            sendRequest()
    }

    function sendRequest() { // 这里插入每个依赖的 Script 标签
        seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
    }

    function onRequest(error) {
        delete fetchingList[requestUri]
        fetchedList[requestUri] = true

        // Save meta data of anonymous module
        // 当加载的js文件含define方法定义的模块且定义了id，通过save方法存储模块的id和依赖，改变模块的状态
        if (anonymousMeta) {
            Module.save(uri, anonymousMeta)
            anonymousMeta = null
        }

        // Call callbacks
        var m,
            mods = callbackList[requestUri]

        delete callbackList[requestUri]
        while ((m = mods.shift())) {
            // When 404 occurs, the params error will be true
            if (error === true) {
                m.error()
            } else {
                // 该模块加载成功后继续执行load 函数，分析其依赖模块并加载依赖模块
                m.load()
            }
        }
    }
}


// Resolve id to uri
Module.resolve = function (id, refUri) {
    var emitData = {
        id,
        refUri
    }
    emit('resolve', emitData)

    return emitData.uri || seajs.resolve(emitData.id, refUri)
}


// Define a module
Module.define = function (id, deps, factory) {
    var argsLen = arguments.length

    // define(factory)
    if (argsLen === 1) {
        factory = id
        id = undefined
    } else if (argsLen === 2) {
        factory = deps

        // define(deps, factory)
        if (isArray(id)) {
            deps = id
            id = undefined
        }
        // define(id, factory)
        else {
            deps = undefined
        }
    }

    // Parse dependencies according to the module factory code
    if (!isArray(deps) && isFunction(factory)) {
        deps = typeof parseDependencies === "undefined" ? [] : parseDependencies(factory.toString())
    }

    var meta = {
        id: id,
        uri: Module.resolve(id),
        deps: deps,
        factory: factory
    }

    // Try to derive uri in IE6-9 for anonymous modules
    if (!isWebWorker && !meta.uri && doc.attachEvent && typeof getCurrentScript !== "undefined") {
        var script = getCurrentScript()

        if (script) {
            meta.uri = script.src
        }

        // NOTE: If the id-deriving methods above is failed, then falls back
        // to use onload event to get the uri
    }

    // Emit `define` event, used in nocache plugin, seajs node version etc
    emit("define", meta)

    // 模块的url为否值时，模块加载完成后使用Module.save(uri, anonymousMeta)更新模块的id、dependencies信息
    meta.uri ? Module.save(meta.uri, meta) :
        // Save information for "saving" work in the script onload event
        anonymousMeta = meta
}

// Save meta data to cachedMods
// 保存模块的一些数据
Module.save = function (uri, meta) {
    var mod = Module.get(uri)

    // Do NOT override already saved modules
    if (mod.status < STATUS.SAVED) {
        mod.id = meta.id || uri
        mod.dependencies = meta.deps || []
        mod.factory = meta.factory
        mod.status = STATUS.SAVED

        emit("save", mod)
    }
}

// Get an existed module or create a new one
Module.get = function (uri, deps) {
    // 针对每个 use 使用特定 id 缓存
    return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}

// Use function is equal to load a anonymous module
Module.use = function (ids, callback, uri) {
    // 一个 use 就是一个 Module 实例
    // ids 不是数组如：seajs.use("examples/todo/1.0.0/main");
    // 统一为数组
    var mod = Module.get(uri, isArray(ids) ? ids : [ids])

    mod._entry.push(mod)
    mod.history = {}
    mod.remain = 1

    mod.callback = function () {
        var exports = []
        var uris = mod.resolve() // 所有依赖模块的完整路径

        for (var i = 0, len = uris.length; i < len; i++) {
            // 执行依赖模块，并且将执行的返回结果保存
            // exports[i] : 为该模块的factory 执行后的返回或者暴露的接口
            exports[i] = cachedMods[uris[i]].exec()
        }

        if (callback) { // 执行回调函数，并把每个依赖的模块的返回值依次作为参数传到回调函数
            callback.apply(global, exports)
        }
        
        delete mod.callback
        delete mod.history
        delete mod.remain
        delete mod._entry
    }

    mod.load()
}


// Public API
// seajs.use 就是一个特殊的模块，他依赖ids 这些模块
seajs.use = function (ids, callback) {
    Module.use(ids, callback, data.cwd + "_use_" + cid())
    return seajs
}

Module.define.cmd = {}
global.define = Module.define


// For Developers

seajs.Module = Module
data.fetchedList = fetchedList
data.cid = cid

seajs.require = function (id) {
    var mod = Module.get(Module.resolve(id))
    if (mod.status < STATUS.EXECUTING) {
        mod.onload()
        mod.exec()
    }
    return mod.exports
}