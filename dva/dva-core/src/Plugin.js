import invariant from 'invariant'
import { isPlainObject } from './utils'

const hooks = [
    'onError',
    'onStateChange',
    'onAction',
    'onHmr',
    'onReducer',
    'onEffect',
    'extraReducers',
    'extraEhancers',
    '_handleActions'
]


// 在 obj 中找到存在于 hooks 中的值，并保存
export function filterHooks(obj) {
    return Object.keys(obj).reduce((memo, key) => {
        if (hooks.indexOf(key) > -1) {
            memo[key] = obj[key]
        }

        return memo
    }, {})
}


export default class Plugin {
    constructor() {
        this._handleActions = null
        this.hooks = hooks.reduce((memo, key) => { // hooks 中对应的每个钩子都是一个钩子函数的数组集合
            memo[key] = []
            return memo
        }, {})
    }


    use(plugin) {
        invariant(
            isPlainObject(plugin),
            'plugin.use: plugin should be plain object'
        )

        const hooks = this.hooks

        for (const key in plugin) {
            if (Object.prototype.hasOwnProperty.call(plugin, key)) {
                invariant(hooks[key], `plugin.use: unknown plugin property: ${key}`)

                if (key === '_handleActions') {
                    this._handleActions = plugin[key]
                } else if (key === 'extraEnhancers') {
                    hooks[key] = plugin[key]
                } else {
                    hooks[key].push(plugin[key])
                }
            }
        }
    }

    // 只能触发 ['onError', 'onHmr'] 这两个钩子
    apply(key, defaultHandler) {
        const hooks = this.hooks
        const validApplyHooks = ['onError', 'onHmr']
        invariant(
            validApplyHooks.indexOf(key) > -1,
            `plugin.apply: hook ${key} cannot be applied`
        )

        const fns = hooks[key]

        return (...args) => {
            if (fns.length) {
                for (const fn of fns) {
                    fn(...args)
                }
            } else if (defaultHandler) {
                defaultHandler(...args)
            }
        }
    }

    get(key) {
        const hooks = this.hooks
        invariant(key in hooks, `plugin.get: hook ${key} cannot be got`)

        if (key === 'extraReducers') {
            return getExtraReducers(hooks[key])
        } else if (key === 'onReducer') {
            return getOnReducer(hooks[key])
        } else {
            return hooks[key]
        }
    }
}


/* const app = dva({
    extraReducers: {
      form: formReducer,
    },
  }); */
function getExtraReducers(hook) {
    let ret = {}
    /* hook=[{
        form: formReducer,
    }] */
    for (const reducerObj of hook) {
        ret = { ...ret, ...reducerObj }
    }
    // ret={form:formReducer}
    return ret
}
/* 
import undoable from 'redux-undo'
const app = dva({
  onReducer: reducer => {
    return (state, action) => {
      const undoOpts = {}
      const newState = undoable(reducer, undoOpts)(state, action)
      // 由于 dva 同步了 routing 数据，所以需要把这部分还原
      return { ...newState, routing: newState.present.routing }
    },
  },
}) */
function getOnReducer(hook) {
    return function (reducer) {
        for (const reducerEnhander of hook) {
            reducer = reducerEnhander(reducer)
        }
        return reducer
    }
}