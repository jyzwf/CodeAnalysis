## 关于事件的一些
```javascript
// instance/events.js
export function initEvents(vm: Component) {
  /*在vm上创建一个_events对象，用来存放事件。*/
  vm._events = Object.create(null)
  /*这个bool标志位来表明是否存在钩子，而不需要通过哈希表的方法来查找是否有钩子，这样做可以减少不必要的开销，优化性能。*/
  vm._hasHookEvent = false
  // init parent attached events
  /*初始化父组件attach的事件*/
  // _parentListeners是父组件中绑定在自定义标签上的事件，供子组件处理。
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

/*更新组件的监听事件*/
export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners: ? Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
}


// vdom/helpers/update-listener.js
/*更新监听事件*/
export function updateListeners(
    on: Object,
    oldOn: Object,
    add: Function,
    remove: Function,
    vm: Component
) {
    let name, cur, old, event
    /*遍历新事件的所有方法*/
    for (name in on) {
        cur = on[name]
        old = oldOn[name]

        /*取得并去除事件的~、!、&等前缀*/
        event = normalizeEvent(name)
        /*isUndef用于判断传入对象不等于undefined或者null*/
        if (isUndef(cur)) {
            /*新方法不存在抛出打印*/
            process.env.NODE_ENV !== 'production' && warn(
                `Invalid handler for event "${event.name}": got ` + String(cur),
                vm
            )
        } else if (isUndef(old)) {
            if (isUndef(cur.fns)) { // cur.fns 就是 cur
                /*createFnInvoker返回一个函数，该函数的作用是将生成时的fns执行，如果fns是数组，则便利执行它的每一项*/
                cur = on[name] = createFnInvoker(cur)   // 很强
                // createFnInvoker 函数返回另一个函数  invoker(),invoker有一个属性fns 就是 cur ,然后执行函数的时候就会执行这个 cur 
            }
            add(event.name, cur, event.once, event.capture, event.passive)
        } else if (cur !== old) {
            old.fns = cur // 只有old 才有 fns 新cur 并不具有 fns 或者说 on[name] 并不知道返回的是什么，所以不能给其加上fns ，而old就是 invoker 函数，有 fns 属性
            // 新的和旧的里面都有这个函数，那么只要把旧的那个的 fns 改为新的，这时候执行的 invoker 函数，里面调用的参数就是新的
            on[name] = old // 即 on[name].fns = cur
        }
    }
    /*移除所有旧的事件*/
    for (name in oldOn) {
        if (isUndef(on[name])) {
            event = normalizeEvent(name)
            remove(event.name, oldOn[name], event.capture)
        }
    }
}


export function createFnInvoker(fns: Function | Array < Function > ): Function {
    function invoker() {
        const fns = invoker.fns
        if (Array.isArray(fns)) {
            for (let i = 0; i < fns.length; i++) {
                fns[i].apply(null, arguments)
            }
        } else {
            // return handler return value for single handlers
            return fns.apply(null, arguments)
        }
    }
    invoker.fns = fns    // fns 属性既可以用来做判断，也可以有保存参数的功能
    return invoker
}
```