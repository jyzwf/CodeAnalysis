/* @flow */

import { _Vue } from '../install'
import type Router from '../index'
import { inBrowser } from '../util/dom'
import { runQueue } from '../util/async'
import { warn, isError } from '../util/warn'
import { START, isSameRoute } from '../util/route'
import {
  flatten,
  flatMapComponents,
  resolveAsyncComponents
} from '../util/resolve-components'

export class History {
	router: Router;
	base: string;
	current: Route;
	pending: ?Route;
	cb: (r: Route) => void;
	ready: boolean;
	readyCbs: Array<Function>;
	readyErrorCbs: Array<Function>;
	errorCbs: Array<Function>;

	// implemented by sub-classes
	+go: (n: number) => void;
	+push: (loc: RawLocation) => void;
	+replace: (loc: RawLocation) => void;
	+ensureURL: (push?: boolean) => void;
	+getCurrentLocation: () => string;

	constructor (router: Router, base: ?string) {
	  this.router = router
		this.base = normalizeBase(base) // 如果不设置就为 ''
		// start with a route object that stands for "nowhere"
		this.current = START
		this.pending = null
		this.ready = false
		this.readyCbs = []
		this.readyErrorCbs = []
		this.errorCbs = []
	}

	listen (cb: Function) {
	  this.cb = cb
	}

	onReady (cb: Function, errorCb: ?Function) {
	  if (this.ready) {
	    cb()
		} else {
	    this.readyCbs.push(cb)
			if (errorCb) {
	      this.readyErrorCbs.push(errorCb)
			}
	  }
	}

	onError (errorCb: Function) {
	  this.errorCbs.push(errorCb)
	}

	transitionTo (
	  location: RawLocation,
	  onComplete?: Function,
	  onAbort?: Function,
	) {
	  const route = this.router.match(location, this.current) // 找到真正对应的路由对象，其中会有redirect,alias,name等的处理
		this.confirmTransition(
	    route,
	    () => {
	      this.updateRoute(route)
				onComplete && onComplete(route)
				this.ensureURL()

				// fire ready cbs once
				if (!this.ready) {
	        this.ready = true
					this.readyCbs.forEach((cb) => {
	          cb(route)
					})
				}
	    },
	    (err) => {
	      if (onAbort) {
	        onAbort(err)
				}
	      if (err && !this.ready) {
	        this.ready = true
					this.readyErrorCbs.forEach((cb) => {
	          cb(err)
					})
				}
	    },
	  )
	}

	confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
	  const current = this.current
		const abort = (err) => {
	    if (isError(err)) {
	      if (this.errorCbs.length) {
	        this.errorCbs.forEach((cb) => {
	          cb(err)
					})
				} else {
	        warn(false, 'uncaught error during route navigation:')
					console.error(err)
				}
	    }
	    onAbort && onAbort(err)
		};
	  if (
	    isSameRoute(route, current) &&
			// in the case the route map has been dynamically appended to
			route.matched.length === current.matched.length
	  ) {
	    this.ensureURL()
			return abort()
		}

	  const { updated, deactivated, activated } = resolveQueue(
	    this.current.matched,
	    route.matched,
	  )

		const queue: Array<?NavigationGuard> = [].concat(
	    // in-component leave guards
	    extractLeaveGuards(deactivated),
	    // global before hooks
	    this.router.beforeHooks,
	    // in-component update hooks
	    extractUpdateHooks(updated),
	    // in-config enter guards
	    activated.map((m) => m.beforeEnter),
	    // async components
	    resolveAsyncComponents(activated), // 这里不收集beforeRouteEnter 是因为可能要跳转的路由对应的是一个异步组件，只有这个组件加载完之后才能获取到其钩子，所以吧这一步放到了queue执行完之后再执行
	  )

		this.pending = route
		const iterator = (hook: NavigationGuard, next) => {
	    if (this.pending !== route) {
	      return abort()
			}
	    try {
	      hook(route, current, (to: any) => {
	        if (to === false || isError(to)) {
	          // next(false) -> abort navigation, ensure current URL
	          // 终止路由跳转
	          this.ensureURL(true)
						abort(to)
					} else if (
	          typeof to === 'string' ||
						(typeof to === 'object' &&
							(typeof to.path === 'string' ||
								typeof to.name === 'string'))
	        ) {
	          // next('/') or next({ path: '/' }) -> redirect
	          // 如重定向到某个路由时，也终止跳转以及后面queue的执行
	          abort()
						if (typeof to === 'object' && to.replace) {
	            this.replace(to) // 替换当前路由
						} else {
	            this.push(to) // 增加一条历史记录
						}
	        } else {
	          // confirm transition and pass on the value
	          next(to)
					}
	      })
			} catch (e) {
	      abort(e)
			}
	  }

		runQueue(queue, iterator, () => {
	    const postEnterCbs = []
			const isValid = () => this.current === route
			// wait until async components are resolved before
			// extracting in-component enter guards
			const enterGuards = extractEnterGuards(
	      activated,
	      postEnterCbs,
	      isValid,
	    )
			const queue = enterGuards.concat(this.router.resolveHooks) // 这里组件还没有被实例化，所以 beforeRouteEnter 里面不能使用this
			runQueue(queue, iterator, () => {
	      if (this.pending !== route) {
	        return abort()
				}
	      this.pending = null
				onComplete(route)
				if (this.router.app) {
	        this.router.app.$nextTick(() => {
	          postEnterCbs.forEach((cb) => {
	            cb()
						})
					})
				}
	    })
		})
	}

	updateRoute (route: Route) {
	  const prev = this.current
		this.current = route
		this.cb && this.cb(route)  
		this.router.afterHooks.forEach((hook) => {  // 执行全局的 `afterEach` 钩子
	    hook && hook(route, prev)
		})
	}
}

// 获取基础路径，以 / 开头，去除结尾的 /
function normalizeBase (base: ?string): string {
  if (!base) {
    if (inBrowser) {
      // respect <base> tag
      const baseEl = document.querySelector('base')
			base = (baseEl && baseEl.getAttribute('href')) || '/'
			// strip full URL origin
			base = base.replace(/^https?:\/\/[^\/]+/, '')
		} else {
      base = '/'
		}
  }
  // make sure there's the starting slash
  if (base.charAt(0) !== '/') {
    base = '/' + base
	}
  // remove trailing slash
  return base.replace(/\/$/, '')
}

// 这里由于current与next都是从顶层向下到目标元素，所以会有重叠部分
function resolveQueue (
  current: Array<RouteRecord>,
  next: Array<RouteRecord>,
): {
	updated: Array<RouteRecord>,
	activated: Array<RouteRecord>,
	deactivated: Array<RouteRecord>,
} {
  let i
	const max = Math.max(current.length, next.length)
	for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
		}
  }
  return {
    updated: next.slice(0, i), // current与next都有的父节点
    activated: next.slice(i), // next 有的子节点
    deactivated: current.slice(i) // current 有的子节点
  }
}

function extractGuards (
  records: Array<RouteRecord>,
  name: string,
  bind: Function,
  reverse?: boolean,
): Array<?Function> {
  const guards = flatMapComponents(records, (def, instance, match, key) => { // key 为组件 name
    const guard = extractGuard(def, name) // 找到钩子函数
		if (guard) {
      // 给每个钩子函数添加上下文对象为组件自身
      return Array.isArray(guard)
        ? guard.map((guard) => bind(guard, instance, match, key))
        : bind(guard, instance, match, key) // 这里可能为 undefined，因为可能不存在 instance
		}
  })
	return flatten(reverse ? guards.reverse() : guards)
}

function extractGuard (
  def: Object | Function,
  key: string,
): NavigationGuard | Array<NavigationGuard> {
  // component:{
  //   beforeRouteEnter: ((to, from, next) => {
  //     next('/userPortrait');
  //   }) as NavigationGuard,
  //   template:'xxx',
  // }
  if (typeof def !== 'function') {
    // extend now so that global mixins are applied.
    // 直接实例化一个子类
    def = _Vue.extend(def)
	}
  return def.options[key]
}

function extractLeaveGuards (deactivated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true) // 这里要reverse的原因是因为deactivated为自顶向下的路径，但执行离开的钩子时要自下向上执行
}

function extractUpdateHooks (updated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(updated, 'beforeRouteUpdate', bindGuard) // https://router.vuejs.org/zh/guide/advanced/navigation-guards.html#%E7%BB%84%E4%BB%B6%E5%86%85%E7%9A%84%E5%AE%88%E5%8D%AB
}

function bindGuard (guard: NavigationGuard, instance: ?_Vue): ?NavigationGuard {
  if (instance) {
    return function boundRouteGuard () {
      return guard.apply(instance, arguments)
		};
  }
}

function extractEnterGuards (
  activated: Array<RouteRecord>,
  cbs: Array<Function>,
  isValid: () => boolean,
): Array<?Function> {
  return extractGuards(
    activated,
    'beforeRouteEnter',
    (guard, _, match, key) => {
      return bindEnterGuard(guard, match, key, cbs, isValid)
		},
  )
}

function bindEnterGuard (
  guard: NavigationGuard,
  match: RouteRecord,
  key: string,
  cbs: Array<Function>,
  isValid: () => boolean,
): NavigationGuard {
  return function routeEnterGuard (to, from, next) {
    return guard(to, from, (cb) => {
      next(cb) // 这里就是vue-router中说的 `传一个回调给 next 来访问组件实例。在导航被确认的时候执行回调，并且把组件实例作为回调方法的参数`,，它会在vue下次更新时执行
			if (typeof cb === 'function') { // 这一步在onCompelete执行完，或者next 终止之后才执行
        cbs.push(() => {
          // #750
          // if a router-view is wrapped with an out-in transition,
          // the instance may not have been registered at this time.
          // we will need to poll for registration until current route
          // is no longer valid.
          poll(cb, match.instances, key, isValid)
				})
			}
    })
	};
}

function poll (
  cb: any, // somehow flow cannot infer this is a function
  instances: Object,
  key: string,
  isValid: () => boolean,
) {
  if (
    instances[key] &&
		!instances[key]._isBeingDestroyed // do not reuse being destroyed instance
  ) {
    cb(instances[key])
	} else if (isValid()) {
    setTimeout(() => {
      poll(cb, instances, key, isValid)  // 轮询
		}, 16)
	}
}
