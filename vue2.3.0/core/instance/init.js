import config from '../config'
import {
    initProxy
} from './proxy'
import {
    initState
} from './state'
import {
    initRender
} from './render'
import {
    initEvents
} from './events'

import {
    mark, // 标记各种时间戳（就像在地图上打点），保存为各种测量值（测量地图上的点之间的距离），便可以批量地分析这些数据了
    measure // 如果要计算标记之间的差值，可以通过“measure”函数来完成。该函数需要三个参数，第一个参数定义了该差值的名称，第二个和第三个变量指定标记的名称。同样，该函数也不返回任何值
} from '../util/perf'
import {
    initLifecycle,
    callHook
} from './lifecycle'
import {
    initProvide,
    initInjections
} from './inject'
import {
    extend,
    mergeOptions,
    formatComponentName
} from '../util/index'

let uid = 0

// 只是在Vue 原型上添加 _init 方法
export function initMixin(Vue: Class<Component>) {
    Vue.prototype._init = function (options?: Object) {
        const vm: Component = this
        // a uid
        vm._uid = uid++;

        let startTag, endTag
        /* istanbul ignore if */
        // 性能测试与记录
        if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
            startTag = `vue-perf-init:${vm._uid}`
            endTag = `vue-perf-end:${vm._uid}`
            mark(startTag) // 打时间戳
        }

        // a flag to avoid this being observed
        /*一个防止vm实例自身被观察的标志位*/
        vm._isVue = true
        // merge options
        // 合并options
        if (options && options._isComponent) {
            // optimize internal component instantiation
            // since dynamic options merging is pretty slow, and none of the
            // internal component options needs special treatment.
            // 优化内部组件实例
            // 因为动态 options 合并非常慢，而且内部组件 options 都不需要特殊的处理。
            initInternalComponent(vm, options)
        } else {
            // 合并两个 options 
            /* vm.$option = {
                components: {
                  KeepAlive,
                  Transition,
                  TransitionGroup
                },
                directives: {
                  model,
                  show
                },
                filters: {},
                _base: Vue,
                el: '#app',
                data: function mergedInstanceDataFn(){}
              } */
            vm.$options = mergeOptions( // 继续进行合并策略，各个属性的合并策略详见 options.js 里的 strat
                resolveConstructorOptions(vm.constructor),  // 获取父类最新的options
                options || {},
                vm
            )
        }
        /* istanbul ignore else */
        if (process.env.NODE_ENV !== 'production') {
            initProxy(vm)   // 初始化代理
        } else {
            vm._renderProxy = vm
        }
        // 下面这部分可以比对Vue 的生命周期图来理解
        // expose real self
        vm._self = vm
        // 初始化生命周期
        initLifecycle(vm)
        // 初始化事件
        initEvents(vm)
        // 初始化render
        initRender(vm)
        // 调用beforeCreate钩子函数并且触发beforeCreate钩子事件
        callHook(vm, 'beforeCreate')
        // 在props/data 之前解决 injections
        initInjections(vm) // resolve injections before data/props
        // 初始化props、methods、data、computed与watch
        initState(vm)
        initProvide(vm) // resolve provide after data/props
        // 调用created钩子函数并且触发created钩子事件
        callHook(vm, 'created')

        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
            // 格式化组件名
            vm._name = formatComponentName(vm, false)
            mark(endTag)
            measure(`${vm._name} init`, startTag, endTag)
        }

        if (vm.$options.el) {
            // 挂载组件
            vm.$mount(vm.$options.el)
        }
    }
}


// 内部组件的初始化
function initInternalComponent(vm: Component, options: InternalComponentOptions) {
    // vm.$options 是以Vue 的 options属性 为原型的对象
    const opts = vm.$options = Object.create(vm.constructor.options)
    // doing this because it's faster than dynamic enumeration.
    // 将options 的一些属性复制到 vm.$options
    opts.parent = options.parent
    opts.propsData = options.propsData
    opts._parentVnode = options._parentVnode
    opts._parentListeners = options._parentListeners
    opts._renderChildren = options._renderChildren
    opts._componentTag = options._componentTag
    opts._parentElm = options._parentElm
    opts._refElm = options._refElm
    if (options.render) {
        opts.render = options.render
        opts.staticRenderFns = options.staticRenderFns
    }
}

export function resolveConstructorOptions(Ctor: Class<Component>) {
    let options = Ctor.options
    // 如果存在父类的时候

    if (Ctor.super) {   // 如果没有这个if 语句，那么如果使用 Vue.mixin 方法混入的属性将不能被子类觉察到，从而不能实现响应式
        // 对其父类进行resolveConstructorOptions，获取父类的options，最新的父类的options，
        // 例如使用Vue.mixin时混入改变了Vue 的options，这时父类的 options 就会改变
        const superOptions = resolveConstructorOptions(Ctor.super)
        // 之前已经缓存起来的父类的options，用以检测是否更新
        const cachedSuperOptions = Ctor.superOptions
        // 对比当前父类的option以及缓存中的option，两个不一样则代表已经被更新
        if (superOptions !== cachedSuperOptions) {
            // super option changed,
            // need to resolve new options.
            // 父类的opiton已经被改变，需要去处理新的option

            // 把新的option缓存起来
            Ctor.superOptions = superOptions
            // check if there are any late-modified/attached options (#4976)
            // 检测是否有最近修改过的 options
            const modifiedOptions = resolveModifiedOptions(Ctor)
            // update base extend options
            if (modifiedOptions) {
                // 如果有修改的，直接修改的替换
                extend(Ctor.extendOptions, modifiedOptions)
            }
            options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
            if (options.name) {
                options.components[options.name] = Ctor
            }
        }
    }
    return options
}

// 获得修改的options值

/**
 *   
 * var Profile = Vue.extend({
    template: '<p>{{firstName}} {{lastName}} aka {{alias}}</p>',
  });
  Vue.mixin({ data: function () {
    return {
      firstName: 'Walter',
      lastName: 'White',
      alias: 'Heisenberg'
    }
  }});
  new Profile().$mount('#mount-point');

 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
    let modified
    const latest = Ctor.options     // 以上面为例，在Vue.mixin 之前，profile 的 sealedOptions 已经定了下来，mixin 后改变了Vue 的options
    // 但是 Ctor.options如何改变呢？或者说是怎么变成最新的状态的
    const extended = Ctor.extendOptions
    const sealed = Ctor.sealedOptions
    for (const key in latest) {
        if (latest[key] !== sealed[key]) {
            if (!modified) modified = {}
            modified[key] = dedupe(latest[key], extended[key], sealed[key])
        }
    }
    return modified
}

function dedupe(latest, extended, sealed) {
    // compare latest and sealed to ensure lifecycle hooks won't be duplicated
    // between merges
    // 确保钩子函数不重复，钩子函数在合并策略时，是数组的形式
    // 这里有哪些情况？？？？？？？？？？？
    // create:[fn1,fn2]
    if (Array.isArray(latest)) {
        const res = []
        sealed = Array.isArray(sealed) ? sealed : [sealed]
        extended = Array.isArray(extended) ? extended : [extended]
        for (let i = 0; i < latest.length; i++) {
            // push original options and not sealed options to exclude duplicated options
            // 以前（sealed）是没有的，但是传入 extend({}) 里对象有这个函数
            if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
                res.push(latest[i])
            }
        }
        return res
    } else {
        return latest
    }
}