/**
 * util-events.js - The minimal events support
 */

var events = data.events = {}

// Bind event
// 绑定事件，一个事件名有多个回调函数
seajs.on = function (name, callback) {
    // events[name] 是一个数组
    var list = events[name] || (events[name] = [])
    list.push(callback)
    return seajs
}

// Remove event. If `callback` is undefined, remove all callbacks for the
// event. If `event` and `callback` are both undefined, remove all callbacks
// for all events

// 移除 特定名字下的指定 callback
// 如果callback 没有定义，直接移除该name 的所有的callback,
// 如果 name / callback 都没有定义，直接移除所有的事件
seajs.off = function (name, callback) {
    // Remove *all* events
    if (!(name || callback)) { // 巧用 || 
        events = data.events = {}
        return seajs
    }


    var list = events[name]
    if (list) {
        if (callback) { // 确定是否有 callback 
            for (var i = list.length - 1; i >= 0; i--) {
                if (list[i] === callback) { // 移除指定的 callback
                    list.splice(i, 1)
                }
            }
        } else {
            // 没有就直接删除
            delete events[name]
        }
    }

    return seajs
}

// Emit event, firing all bound callbacks. Callbacks receive the same
// arguments as `emit` does, apart from the event name

// 触发事件，所有的事件均有相同的参数
var emit = seajs.emit = function (name, data) {
    var list = events[name]

    if (list) {
        // Copy callback lists to prevent modification
        // 拷贝副本
        list = list.slice()

        // Execute event callbacks, use index because it's the faster.
        for (var i = 0, len = list.length; i < len; i++) {
            list[i](data)
        }
    }

    return seajs
}