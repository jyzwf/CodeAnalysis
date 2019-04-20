## shared

### consants.js


## 判断是否是服务端渲染
通过判断 `window`和`global`是否存在来判断
```javascript
// core/util/env.js

export const inBrowser = typeof window !== 'undefined'

let _isServer
export const isServerRendering = () => {
    if (_isServer === undefined) {
        // 判断window 是否存在并且 global 是否存在
        if (!inBrowser && typeof global !== 'undefined') {
            // detect presence of vue-server-renderer and avoid
            // Webpack shimming the process
            _isServer = global['process'].env.VUE_ENV === 'server'
        } else {
            _isServer = false
        }
    }
    return _isServer
}
```


## vm.$once实现
```javascript
// core/instance/events.js
 Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this

    function on() {
      /*在第一次执行的时候将该事件销毁*/
      vm.$off(event, on)
      /*执行注册的方法*/
      fn.apply(vm, arguments)
    }
    on.fn = fn
    // 当 emit(event)时，执行 `on` 函数，先卸载 `on` 函数，在执行该监听函数 fn ,这样就做到了执行一次
    vm.$on(event, on)
    return vm
  }
```

## 函数指令序列化后加入options 
```javascript
//init.js
vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
)

// options.js -> mergeOptions
normalizeDirectives(child)
/*将函数指令序列化后加入对象*/
function normalizeDirectives(options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = {
          bind: def,
          update: def
        }
      }
    }
  }
}

//示例
/*
directives: {
  focus: {
    // 指令的定义
    inserted: function (el) {
      el.focus()
    }
  },

  blur()=>{
    // xxx
  }
}

=>

directives: {
  focus: {
    // 指令的定义
    inserted: function (el) {
      el.focus()
    }
  },

  blur:{
    bind()=>{//xxx},
    update()=>{//xxx}
  }
}
*/

```


## callHook疑问
```javascript
// lifecycle.js
/*调用钩子函数并且触发钩子事件*/
export function callHook(vm: Component, hook: string) {
    const handlers = vm.$options[hook]
    if (handlers) {
        // 这里为什么是循环？
        for (let i = 0, j = handlers.length; i < j; i++) {
            try {
                handlers[i].call(vm)
            } catch (e) {
                handleError(e, vm, `${hook} hook`)
            }
        }
    }
    // 这里判断是否有自定义 `钩子事件`
    // 见 event.js -> `eventsMixin`
    if (vm._hasHookEvent) {
        vm.$emit('hook:' + hook)
    }
}
```
如上，为什么有循环，这是因为 `Vue` 使用 `mixin` 时会混入钩子函数，如下：
```javascript
var mixin = {
  created: function () {
    console.log('混入对象的钩子被调用')
  }
}

new Vue({
  mixins: [mixin],
  created: function () {
    console.log('组件钩子被调用')
  }
})

// => "混入对象的钩子被调用"
// => "组件钩子被调用"
```
并且 `同名钩子函数将混合为一个数组，因此都将被调用。另外，混入对象的钩子将在组件自身钩子之前调用。`


## initState发生了什么
初始化props、methods、data、computed与watch
```javascript
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  /*初始化props*/
  if (opts.props) initProps(vm, opts.props)
  /*初始化方法*/
  if (opts.methods) initMethods(vm, opts.methods)
  /*初始化data*/
  if (opts.data) {
    initData(vm)
  } else {
    /*该组件没有data的时候绑定一个空对象*/
    observe(vm._data = {}, true /* asRootData */)
  }
  /*初始化computed*/
  if (opts.computed) initComputed(vm, opts.computed)
  /*初始化watchers*/
  if (opts.watch) initWatch(vm, opts.watch)
}
```


## method 对象中的各个方法是如何绑定到 `vm` 上的
```javascript
// state.js
/*初始化方法*/
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    /*在为null的时候写上空方法，有值时候将上下文替换成vm*/
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)    // 将方法中的this 绑定到 vm 上，这样就可以使用 vm 上的 data,prop等
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      /*与props名称冲突报出warning*/
      if (props && hasOwn(props, key)) {
        warn(
          `method "${key}" has already been defined as a prop.`,
          vm
        )
      }
    }
  }
}
```


## 匹配 options 里的 components
在 `create-element.js` 里面，
```javascript
if (typeof tag === 'string') {
        let Ctor
        /*获取tag的名字空间*/
        ns = config.getTagNamespace(tag)
        /*判断是否是保留的标签*/
        if (config.isReservedTag(tag)) {
            // platform built-in elements
            /*如果是保留的标签则创建一个相应节点*/
            vnode = new VNode(
                config.parsePlatformTagName(tag), data, children,
                undefined, undefined, context
            )
        } else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
            // component
            /*从vm实例的option的components中寻找该tag，存在则就是一个组件，创建相应节点，Ctor为组件的构造类*/
            vnode = createComponent(Ctor, data, context, children, tag)
        } else {
            // unknown or unlisted namespaced elements
            // check at runtime because it may get assigned a namespace when its
            // parent normalizes children
            /*未知的元素，在运行时检查，因为父组件可能在序列化子组件的时候分配一个名字空间*/
            vnode = new VNode(
                tag, data, children,
                undefined, undefined, context
            )
        }
    }
```
注意 `else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag)))`

来到 `resolveAssert`
```javascript
// options.js
export function resolveAsset(
  options: Object,
  type: string,
  id: string,
  warnMissing ? : boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  /*分别用id本身、驼峰以及大写开头驼峰寻找是否存在，存在则返回，不存在则打印*/
  const assets = options[type]   // 此时的 type 是 'components' ，assert 就是options 里的components 对象
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  /*转化为驼峰命名*/
  const camelizedId = camelize(id)
  // camelize('a00-b11-c22') -> "a00B11C22"
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  /*驼峰首字母大写*/
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain   有可能存在于原型链上或者不存在
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
```
