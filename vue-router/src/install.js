import View from './components/view'
import Link from './components/link'

export let _Vue // 以便在其他需要使用Vue方法的地方使用，从而需要引入Vue包

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
	install.installed = true

	_Vue = Vue

	const isDef = (v) => v !== undefined

	const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
		if (
      isDef(i) &&
			isDef((i = i.data)) &&
			isDef((i = i.registerRouteInstance))
    ) {
      i(vm, callVal)
		}
  }

	Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        this._routerRoot = this
				this._router = this.$options.router
				this._router.init(this)
				Vue.util.defineReactive(
          this,
          '_route',
          this._router.history.current,
        )
			} else {
        // 找到拥有 _routerRoot 的父节点
        this._routerRoot =
					(this.$parent && this.$parent._routerRoot) || this
			}
      registerInstance(this, this)
		},
    destroyed () {
      registerInstance(this)
		}
  })

	// 将$router挂载到Vue原型链上，这样所有的vue实例就都能使用
	Object.defineProperty(Vue.prototype, '$router', {
    get () {
      return this._routerRoot._router
		}
  })

	Object.defineProperty(Vue.prototype, '$route', {
    get () {
      return this._routerRoot._route
		}
  })

	Vue.component('RouterView', View)
	Vue.component('RouterLink', Link)

	const strats = Vue.config.optionMergeStrategies
	// use the same hook merging strategy for route hooks
	strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate =
		strats.created
}
