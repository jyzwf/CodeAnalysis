## vm 上的属性
1. _uid
```javascript
// init.js
vm._uid=uid++
```

2. _isVue
```javascript
// init.js
vm._isVue = true
```

3. $options
```javascript
// init.js
vm.$options = Object.create(vm.constructor.options)
```

4. _renderProxy

5. _self
```javascript
// init.js
vm._self = vm
```

6. 
```javascript
// init.js
initLifecycle(vm)

// initLifecycle.js
vm.$parent = parent
vm.$root = parent ? parent.$root : vm

vm.$children = []
vm.$refs = {}

vm._watcher = null
vm._inactive = null
vm._directInactive = false
vm._isMounted = false
vm._isDestroyed = false
vm._isBeingDestroyed = false
```

7. 
```javascript
// init.js
initEvents(vm)

// events.js
vm._events = Object.create(null)
vm._hasHookEvent = false

```

8.
```javascript
//init.js
initState(vm)

// state.js

// initProps
vm._props = {}
```

9.  
```javascript
// state.js

// initComputed
const watchers = vm._computedWatchers = Object.create(null)
```

10.
```javascript
// watcher.js
vm._watchers.push(this)
```