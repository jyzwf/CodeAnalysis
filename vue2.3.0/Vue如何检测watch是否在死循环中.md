实例：
```javascript
watch: {
        test () {
          this.test++;
        }
      }
```

这时候，这个 `test` 就处于无限循环中，这显然不行，那么 Vue 是如何规避或者说是如何给出提示的呢？

来到，`observer/scheduler.js`
```javascript

export const MAX_UPDATE_COUNT = 100

function flushSchedulerQueue() {
  flushing = true
  let watcher, id

    // ......

  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    id = watcher.id
    /*将has的标记删除*/
    has[id] = null
    /*执行watcher*/
    watcher.run()
    // in dev build, check and stop circular updates.
    /*
      在测试环境中，检测watch是否在死循环中
      比如这样一种情况
      watch: {
        test () {
          this.test++;
        }
      }
      持续执行了一百次watch代表可能存在死循环
    */
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user ?
            `in watcher with expression "${watcher.expression}"` :
            `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

//   ......
}
``` 
所以，可以看到，是让该函数执行 `100次`， 如果该 watch 是处于无限循环中，那它就会给出警告