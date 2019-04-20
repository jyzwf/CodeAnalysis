1. 
```javascript
// props.js
// validateProp
if (isType(Boolean, prop.type)) {
    /*当父组件没有传入prop并且default中也不存在该prop时，赋值为false*/
    if (absent && !hasOwn(prop, 'default')) {
      value = false
      // isType(String, prop.type)为啥这里还要这么判断下？？？？？？？？？？？？
    } else if (!isType(String, prop.type) && (value === '' || value === hyphenate(key))) { // 将key 转化为 连字符形式
      value = true
    }
}
```


2.  
```javascript
// observer/index.js

// set
export function set(target: Array < any > | Object, key: any, val: any): any {
    /*如果传入数组则在指定位置插入val*/
    if (Array.isArray(target) && typeof key === 'number') {
        target.length = Math.max(target.length, key)
        target.splice(key, 1, val)
        /*因为数组不需要进行响应式处理，数组会修改七个Array原型上的方法来进行响应式处理*/
        return val
    }
    /*如果是一个对象，并且已经存在了这个key则直接返回*/
    if (hasOwn(target, key)) {
        target[key] = val // 调用set 会触发notify
        return val
    }
    /*获得target的Oberver实例*/
    const ob = (target: any).__ob__
    /*
      _isVue 一个防止vm实例自身被观察的标志位 ，_isVue为true则代表vm实例，也就是this
      vmCount判断是否为根节点，存在则代表是data的根节点，Vue 不允许在已经创建的实例上动态添加新的根级响应式属性(root-level reactive property)
    */
    if (target._isVue || (ob && ob.vmCount)) {
        /*  
          Vue 不允许在已经创建的实例上动态添加新的根级响应式属性(root-level reactive property)。
          https://cn.vuejs.org/v2/guide/reactivity.html#变化检测问题
        */
        process.env.NODE_ENV !== 'production' && warn(
            'Avoid adding reactive properties to a Vue instance or its root $data ' +
            'at runtime - declare it upfront in the data option.'
        )
        return val
    }

    // ????????????????????????????? 是不是代表设置不存在Observer 的属性时，会不触发响应   
    /* 
        var a = {}
        a.b.c = 6   // 报错
    */
    if (!ob) {
        target[key] = val
        return val
    }
    /*为对象defineProperty上在变化时通知的属性*/
    defineReactive(ob.value, key, val)
    ob.dep.notify()
    return val
}
```