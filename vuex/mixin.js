export default function (Vue) {
    const version = Number(Vue.version.split('.')[0])

    if (version >= 2) {
        Vue.mixin({
            beforeCreate: vuexInit
        })
    } else {
        // override init and inject vuex init procedure
        // for 1.x backwards compatibility.
        const _init = Vue.prototype._init
        Vue.prototype._init = function (options = {}) {
            options.init = options.init ? [vuexInit].concat(options.init) :
                vuexInit
            _init.call(this, options)
        }
    }

    /**
     * Vuex init hook, injected into each instances init hooks list.
     */

    function vuexInit() {
        // this -> vm
        const options = this.$options
        // store injection
        if (options.store) { // 获取传入new Vue({store}) 里面的 store，并注册为 vm 的 $store 属性
            this.$store = typeof options.store === 'function' ?
                options.store() :
                options.store
        } else if (options.parent && options.parent.$store) {
            // 子组件从其父组件引用 $store 属性
            this.$store = options.parent.$store
        }
    }
}