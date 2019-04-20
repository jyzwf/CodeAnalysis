/* @flow */

import {
    toArray
} from '../util/index'

/*初始化use*/
export function initUse(Vue: GlobalAPI) {
    Vue.use = function (plugin: Function | Object) {
        /* istanbul ignore if */
        /*标识位检测该插件是否已经被安装*/
        if (plugin.installed) {
            return
        }
        // use 支持传入一个选项对象
        // Vue.use(MyPlugin, { someOption: true })
        const args = toArray(arguments, 1)  //获取可选对象
        
        args.unshift(this)  // 将Vue 构造器传入，当插件的第一个参数
        if (typeof plugin.install === 'function') {
            // install执行插件安装
            plugin.install.apply(plugin, args)
        } else if (typeof plugin === 'function') {
            plugin.apply(null, args)
        }
        plugin.installed = true  // 防止再次安装
        return this
    }
}