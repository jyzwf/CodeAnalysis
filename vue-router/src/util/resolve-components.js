/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'

export function resolveAsyncComponents (matched: Array<RouteRecord>): Function {
  return (to, from, next) => {
    let hasAsync = false // 是否有异步的标识
		let pending = 0 // 因为 matched 是一系列的组件，所以这里需要一个计数，只有这些组件都resolve了，才能next
		let error = null

		flatMapComponents(matched, (def, _, match, key) => {
      // if it's a function and doesn't have cid attached,
      // assume it's an async component resolve function.
      // we are not using Vue's default async resolving mechanism because
      // we want to halt the navigation until the incoming component has been
      // resolved.
      if (typeof def === 'function' && def.cid === undefined) {
        hasAsync = true
				pending++

				const resolve = once((resolvedDef) => {
          if (isESModule(resolvedDef)) {
            // 获取到异步的组件
            resolvedDef = resolvedDef.default
					}
          // save resolved on async factory in case it's used elsewhere
          def.resolved =
						typeof resolvedDef === 'function'
						  ? resolvedDef
						  : _Vue.extend(resolvedDef)
					match.components[key] = resolvedDef
					pending--
					if (pending <= 0) {
            next() // 只有全部加载完了才表示已经 resolve 了
					}
        })

				const reject = once((reason) => {
          const msg = `Failed to resolve async component ${key}: ${reason}`
					process.env.NODE_ENV !== 'production' && warn(false, msg)
					if (!error) {
            error = isError(reason) ? reason : new Error(msg)
						next(error)
					}
        })
				// 这里的def 可能是 () => import('xxx')
				let res
				try {
          res = def(resolve, reject)
				} catch (e) {
          reject(e)
				}
        if (res) {
          if (typeof res.then === 'function') {
            res.then(resolve, reject)
					} else {
            // new syntax in Vue 2.3
            const comp = res.component
						if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
						}
          }
        }
      }
    })

		if (!hasAsync) next()
	};
}

export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function,
): Array<?Function> {
  return flatten(
    matched.map((m) => {
      return Object.keys(m.components).map((key) =>
        fn(m.components[key], m.instances[key], m, key),
      )
		}),
  )
}

export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
	typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

function isESModule (obj) {
  return (
    obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
  )
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
function once (fn) {
  let called = false
	return function (...args) {
    if (called) return
		called = true
		return fn.apply(this, args)
	};
}
