import applyMixin from './mixin'
import devtoolPlugin from './plugins/devtool'
import ModuleCollection from './module/module-collection'
import {
  forEachValue,
  isObject,
  isPromise,
  assert
} from './util'

let Vue // bind on install

export class Store {
  constructor(options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    // 如果是变量Vue不存在，且是浏览器环境，全局windows 下有安装了Vue
    // 就自动进行安装vuex
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }

    if (process.env.NODE_ENV !== 'production') {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
      assert(this instanceof Store, `Store must be called with the new operator.`)
    }

    const {
      plugins = [],
        strict = false
    } = options

    // store internal state
    // 是否在进行提交状态标识
    this._committing = false
    // 用户定义的 actions
    this._actions = Object.create(null)
    // action 订阅者
    this._actionSubscribers = []
    // // 用户定义的 mutations
    this._mutations = Object.create(null)
    // 用户定义的 getters
    this._wrappedGetters = Object.create(null)
    // 收集用户定义的 modules，返回最外层的 根模块
    this._modules = new ModuleCollection(options)
    // 模块命名空间map
    this._modulesNamespaceMap = Object.create(null)
    // 存储所有对 mutation 变化的订阅者,当执行commit时会执行队列中的函数
    this._subscribers = []
    // 创建一个 Vue 实例, 利用 $watch 监测 store 数据的变化
    this._watcherVM = new Vue()

    // bind commit and dispatch to self
    const store = this
    const {
      dispatch,
      commit
    } = this

    // 将dispatch与commit调用的this绑定为store对象本身，
    // 否则在组件内部this.dispatch时的this会指向组件的vm
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit(type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    plugins.forEach(plugin => plugin(this))

    if (Vue.config.devtools) {
      devtoolPlugin(this)
    }
  }

  get state() {
    return this._vm._data.$$state
  }

  set state(v) {
    if (process.env.NODE_ENV !== 'production') {
      assert(false, `Use store.replaceState() to explicit replace store state.`)
    }
  }

  commit(_type, _payload, _options) {
    // check object-style commit
    // 这里就是获取正确的 type / payload /options
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = {
      type,
      payload
    }

    // 获取触发的type  对应的 mutation
    const entry = this._mutations[type]
    if (!entry) { // 如果不存在，给出警告
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    this._withCommit(() => { // 由于entry是一个数组，所以逐个执行，并传入负载
      entry.forEach(function commitIterator(handler) {
        handler(payload)
      })
    })

    // 触发 订阅函数
    this._subscribers.forEach(sub => sub(mutation, this.state))

    if (
      process.env.NODE_ENV !== 'production' &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }

  dispatch(_type, _payload) { // 基本和commit 一样
    // check object-style dispatch
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const action = {
      type,
      payload
    }
    const entry = this._actions[type]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }


    this._actionSubscribers.forEach(sub => sub(action, this.state))

    return entry.length > 1 ?
      Promise.all(entry.map(handler => handler(payload))) :
      entry[0](payload)
  }

  subscribe(fn) {
    return genericSubscribe(fn, this._subscribers)
  }

  subscribeAction(fn) {
    return genericSubscribe(fn, this._actionSubscribers)
  }

  watch(getter, cb, options) {
    if (process.env.NODE_ENV !== 'production') {
      assert(typeof getter === 'function', `store.watch only accepts a function.`)
    }
    return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
  }

  replaceState(state) {
    this._withCommit(() => {
      this._vm._data.$$state = state
    })
  }

  //vuex 支持模块动态注册
  // 该函数与上面讲的流程差不多，这里不再多讲，
  // 不过将一些过程抽出来暴露为接口的想法还是不错的
  // 同时不得不服作者的整体架构，这样才能保证有这样的函数抽离出来
  registerModule(path, rawModule, options = {}) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }

    this._modules.register(path, rawModule)
    installModule(this, this.state, path, this._modules.get(path), options.preserveState)
    // reset store to update getters...
    resetStoreVM(this, this.state)
  }

  // 动态卸载模块。注意，你不能使用此方法卸载静态模块（即创建 store 时声明的模块）。
  unregisterModule(path) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    this._modules.unregister(path)
    this._withCommit(() => {  // 触发vue 的响应式
      const parentState = getNestedState(this.state, path.slice(0, -1))
      Vue.delete(parentState, path[path.length - 1])
    })
    // 重置 store
    resetStore(this)
  }

  // 热更新
  hotUpdate(newOptions) {
    this._modules.update(newOptions)
    // 重置 store
    resetStore(this, true)
  }

  _withCommit(fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}


// 加入订阅者
function genericSubscribe(fn, subs) {
  if (subs.indexOf(fn) < 0) {
    subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      subs.splice(i, 1)
    }
  }
}

// 重置store的属性
function resetStore(store, hot) {
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // init all modules
  installModule(store, state, [], store._modules.root, true)
  // reset vm
  resetStoreVM(store, state, hot)
}

function resetStoreVM(store, state, hot) {
  const oldVm = store._vm // 之前的 vue 实例

  // bind store public getters
  store.getters = {}
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    computed[key] = () => fn(store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}

function installModule(store, rootState, path, module, hot) {
  const isRoot = !path.length
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      Vue.set(parentState, moduleName, module.state)
    })
  }

  const local = module.context = makeLocalContext(store, namespace, path)

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => { // 递归字模块
    installModule(store, rootState, path.concat(key), child, hot)
  })
}

/**
 * make localized dispatch, commit, getters and state
 * if there is no namespace, just use root ones
 */
function makeLocalContext(store, namespace, path) {
  const noNamespace = namespace === ''
  // 这里是在本地dispatch / commit
  // 如下面例子：
  /* actions: {
    actionA(){},
    actionB({
      dispatch,
      commit
    }) {
      return dispatch('actionA').then(() => {
        commit('someOtherMutation')
      })
    } */
  // 所以说，如果在组件实例中 dispatch ,就要加上模块名
  const local = {
    // 如果没有命名空间，就直接获取 store的dispatch
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      // 获取正确的 type / payload /options
      // Actions 支持同样的载荷方式和对象方式进行分发：
      const args = unifyObjectStyle(_type, _payload, _options)
      const {
        payload,
        options
      } = args
      let {
        type
      } = args

      // options 不存在，或者其root 属性不存在
      // 因为vuex 支持下面功能：
      // 需要在全局命名空间内分发 action 或提交 mutation，
      // 将 { root: true } 作为第三参数传给 dispatch 或 commit 即可
      // 这里是不需要分发的情况
      if (!options || !options.root) {
        type = namespace + type // 获取命名空间下的 action 
        // 使用命名空间
        if (process.env.NODE_ENV !== 'production' && !store._actions[type]) { // 确保 dispatch 的 action存在
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
          return
        }
      }
      // 这里已经对type 做了命名空间的处理，
      // 如果传入了 { root: true } ,这里的 type 就是没有加上 namespace 的，
      // 如果没有传入 { root: true }，这里的 type 经过上面的 if 处理，也就可以正确触发了 
      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const {
        payload,
        options
      } = args
      let {
        type
      } = args

      if (!options || !options.root) {
        type = namespace + type
        if (process.env.NODE_ENV !== 'production' && !store._mutations[type]) {
          console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`)
          return
        }
      }

      store.commit(type, payload, options)
    }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace ?
        () => store.getters :
        () => makeLocalGetters(store, namespace)
    },
    state: {
      // 获取嵌套的state
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}

function makeLocalGetters(store, namespace) {
  const gettersProxy = {}
  // 获取命名空间长度
  const splitPos = namespace.length
  // 循环每个 getters 
  Object.keys(store.getters).forEach(type => {
    // skip if the target getter is not match this namespace
    // 跳过没有匹配与命名空间不匹配的 getter
    if (type.slice(0, splitPos) !== namespace) return

    // extract local getter type
    // 提出 getter 类型
    // 有 namespace 如：namespace 为 moduleA/moduleC/，type 为 moduleA/moduleC/cGetter，则 localType 为 cGetter
    // 没有 namespace , 或者说那么spacename ='' ,type 为 cGetter，则 localType 为 cGetter
    // slice 不改变原字符串
    const localType = type.slice(splitPos)

    // Add a port to the getters proxy.
    // Define as getter property because
    // we do not want to evaluate the getters in this time.
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type], // 获取原字符串所对应的 getter
      enumerable: true
    })
  })

  return gettersProxy
}

// 注册各个模块的 mutaations 方法到 store._mutations 中，每个type对应一个数组
function registerMutation(store, type, handler, local) {
  // 将相同的type放入到同一个数组中，这是因为在没有命名空间的情况下，各个模块会有相同的 mutation
  // 这样把这些 mutations 注册到全局，commit(type) 时候，就全部触发
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler(payload) { // 获取负载，只有它是需要用户传进来的
    handler.call(store, local.state, payload)
  })
}

// 注册各个模块的 actions 到store._actions
function registerAction(store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  // 这里要说明下，由于 action 里是执行异步的地方，所以，如果没有命名空间的情况下
  // 多个相同 type 的action 加入到 store._actions[type]，dispatch(type) 的时候，
  // 就要等这几个 action 都完成后才能 返回结果，所以这里用来 Promise 来处理，于此同时，
  // 在dispatch(type) 里面，也会使用 Promise.all()，来等待所有结果返回
  entry.push(function wrappedActionHandler(payload, cb) {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload, cb)

    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }

    // 调用开发者工具，并在错误的时候触发 vuex:error
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}

// 注册各个模块的 getters 到store._wrappedGetters
function registerGetter(store, type, rawGetter, local) {
  // getter 不能重复，因为他是依靠 vue 的computed 属性，computed 属性不能重复，这个也就不能重复
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter(store) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}

function enableStrictMode(store) {
  store._vm.$watch(function () {
    return this._data.$$state
  }, () => {
    if (process.env.NODE_ENV !== 'production') {
      assert(store._committing, `Do not mutate vuex store state outside mutation handlers.`)
    }
  }, {
    deep: true,
    sync: true
  })
}

function getNestedState(state, path) {
  return path.length ?
    path.reduce((state, key) => state[key], state) :
    state
}

function unifyObjectStyle(type, payload, options) {
  /* store.dispatch({
    type: 'incrementAsync',
    amount: 10
  }) */
  if (isObject(type) && type.type) {
    options = payload
    payload = type
    type = type.type
  }

  if (process.env.NODE_ENV !== 'production') {
    assert(typeof type === 'string', `Expects string as the type, but found ${typeof type}.`)
  }

  return {
    type,
    payload,
    options
  }
}

export function install(_Vue) {
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}