## Vue 里的 `computed`
```javascript
// state.js

const computedWatcherOptions = {
  lazy: true
}

/*初始化computed*/
function initComputed(vm: Component, computed: Object) {
  const watchers = vm._computedWatchers = Object.create(null)

  for (const key in computed) {
    const userDef = computed[key]
    /*
      计算属性可能是一个function，也有可能设置了get以及set的对象。
      可以参考 https://cn.vuejs.org/v2/guide/computed.html#计算-setter
    */
    let getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production') {
      /*getter不存在的时候抛出warning并且给getter赋空函数*/
      if (getter === undefined) {
        warn(
          `No getter function has been defined for computed property "${key}".`,
          vm
        )
        getter = noop
      }
    }
    // create internal watcher for the computed property.
    /*
      为计算属性创建一个内部的监视器Watcher，保存在vm实例的_computedWatchers中
      这里的computedWatcherOptions参数传递了一个lazy为true，会使得watch实例的dirty为true
    */
    watchers[key] = new Watcher(vm, getter, noop, computedWatcherOptions)

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    /*组件正在定义的计算属性已经定义在现有组件的原型上则不会进行重复定义*/
    if (!(key in vm)) {
      /*定义计算属性*/
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      /*如果计算属性与已定义的data或者props中的名称冲突则发出warning*/
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/*定义计算属性*/
export function defineComputed(target: any, key: string, userDef: Object | Function) {
  if (typeof userDef === 'function') {
    /*创建计算属性的getter*/
    sharedPropertyDefinition.get = createComputedGetter(key)
    /*
      当userDef是一个function的时候是不需要setter的，所以这边给它设置成了空函数。
      因为计算属性默认是一个function，只设置getter。
      当需要设置setter的时候，会将计算属性设置成一个对象。参考：https://cn.vuejs.org/v2/guide/computed.html#计算-setter
    */
    sharedPropertyDefinition.set = noop
  } else {
    /*get不存在则直接给空函数，如果存在则查看是否有缓存cache，没有依旧赋值get，有的话使用createComputedGetter创建*/
    sharedPropertyDefinition.get = userDef.get ?
      userDef.cache !== false ?
      createComputedGetter(key) :
      userDef.get :
      noop
    /*如果有设置set方法则直接使用，否则赋值空函数*/
    sharedPropertyDefinition.set = userDef.set ?
      userDef.set :
      noop
  }
  /*defineProperty上getter与setter*/
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/*创建计算属性的getter*/
function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      /*实际是脏检查，在计算属性中的依赖发生改变的时候dirty会变成true，在get的时候重新计算计算属性的输出值*/
      if (watcher.dirty) {
        watcher.evaluate()
      }
      /*依赖收集*/
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```