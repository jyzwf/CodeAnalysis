import { combineReducers } from 'redux'
import createSagaMiddleware from 'redux-saga/lib/internal/middleware'
import invariant from 'invariant'
import checkModel from './checkModel'
import prefixNamespace from './prefixNamespace'
import Plugin, { filterHooks } from './Plugin'
import createStore from './createStore'
import getSaga from './getSaga'
import getReducer from './getReducer'
import createPromiseMiddleware from './createPromiseMiddleware'

import {
    run as runSubscription,
    unlisten as unlistenSubscription
} from './subscription'

import { noop } from './utils'

// ==========================================================//
//                                                           //
//       以下以demo文件中的 myapp/src/index.js例子来分析       //
//                                                           //
// ==========================================================//


// Internal model to update global state when do unmodel
const dvaModel = {
    namespace: "@@dva",
    state: 0,
    reducers: {
        UPDATE(state) {
            return state + 1
        }
    }
}

/**
 * Create dva-core instance.
 *
 * @param hooksAndOpts
 * @param createOpts
 */

export function create(hooksAndOpts = {}, createOpts = {}) {
    const { initialReducer, setupApp = noop } = createOpts

    const plugin = new Plugin()
    // opts 里也可以配所有的 hooks
    plugin.use(filterHooks(hooksAndOpts))

    const app = {
        _models: [prefixNamespace({ ...dvaModel })],    // 这里就是[dvaModel]
        _store: null,
        _plugin: plugin,
        use: plugin.use.bind(plugin),
        model,
        start
    }

    return app



    /**
     * Register model before app is started.
     *
     * @param m {Object} model to register
     */
    function model(m) {
        if (process.env.NODE_ENV !== 'production') {
            // 1. namespace 必须定义&&是字符串&&唯一
            // 
            // 2. state 不作约束
            // 
            // 3 .reducers 可以为空，PlainObject 或者为数组 && 
            // 数组的 reducers 必须是 [Object,Function] 的格式
            // e.g. [(state, action) => newState, enhancer]
            // 
            // 4. effects 可以为空，PlainObject
            // 
            // 5. subscriptions 可以为空，PlainObject
            // 所有 subscription 必须为函数

            checkModel(m, app._models)
        }

        // prefixNamespace 主要做 reducers 为数组时和 effects 的前缀设置
        // 主要是 `${namespace}/${key}` 形式
        // 这里我们的 reducers 为对象，所以只为 effect 做前缀设置
        const prefixModel = prefixNamespace({ ...m })

        /* {
            // xxx...

            effects: {
                'count/add': function*(action, { call, put }) {
                    yield call(delay, 1000)
                    yield put({ type: 'minus' })
                }
            }

            // xxx...
        } */

        // 将当前检查过的 model 加入总的 app._models 集合中
        app._models.push(prefixModel)
        // 返回 做了类型检查的 && 加了前缀的 model
        return prefixModel
    }




    /**
      * Inject model after app is started.
      *
      * @param createReducer
      * @param onError
      * @param unlisteners
      * @param m
      */
    function injectModel(createReducer, onError, unlisteners, m) {
        m = model(m)

        const store = app._store

        store.asyncReducers[m.namespace] = getReducer(
            m.reducers,
            m.state,
            plugin._handleActions
        )

        store.replaceReducer(createReducer(store.asyncReducers))
        if (m.effects) {
            store.runSaga(
                app._getSaga(m.effects, m, onError, plugin.get('onEffect'))
            )
        }

        if (m.subscriptions) {
            unlisteners[m.namespace] = runSubscription(
                m.subscriptions,
                m,
                app,
                onError
            )
        }
    }

    /**
     * Unregister model.
     *
     * @param createReducer
     * @param reducers
     * @param unlisteners
     * @param namespace
     *
     * Unexpected key warn problem:
     * https://github.com/reactjs/redux/issues/1636
     */

    function unmodel(createReducer, reducers, unlisteners, namespace) {
        const store = app._store

        // delete reducers
        delete store.asyncReducers[namespace]
        delete reducers[namespace]

        store.replaceReducer(createReducer())
        store.dispatch({ type: '@@dva/UPDATE' })

        // Cancel effects
        store.dispatch({ type: `${namespace}/@@CANCEL_EFFECTS` })

        // Unlisten subscriptions
        unlistenSubscription(unlisteners, namespace)

        // Delete model from app._models
        app._model = app._models.filter(model => model.namespace !== namespace)
    }


    /**
     * Start the app.
     *
     * @returns void
     */

    function start() {
        // Gobal error handler
        const onError = err => {
            if (err) {
                if (typeof err === 'string') err = new Error(err)
                err.preventDefault = () => {
                    err._dontReject = true
                }

                // 触发 onError 钩子函数集合
                plugin.apply('onError', err => {
                    throw new Error(err.stack || err)
                })(err, app._store.dispatch)
            }
        }

        const sagaMiddleware = createSagaMiddleware()
        const promiseMiddleware = createPromiseMiddleware(app)
        app._getSaga = getSaga.bind(null)

        const sagas = []
        // reducers = {routing}
        const reducers = { ...initialReducer }

        for (const m of app._models) {  //遍历所有的model，当前只有 dva本身的和我们自己创建的一个model
            // 将各个model 的命名空间注入到 reducers 对象中
            /* reducers = {
                routing,
                '@@dva': (state = defaultState, action) => reducer(state, action),    // 来自 ./handleActions
                'count': (state = defaultState, action) => reducer(state, action),
            } */
            reducers[m.namespace] = getReducer(
                m.reducers,
                m.state,
                plugin._handleActions
            )

            if (m.effects) {
                sagas.push(app._getSaga(m.effects, m, onError, plugin.get('onEffect')))
            }

            // sagas = [function* () { }/* 来自 ./getSaga.js */]
        }

        const reducerEnhancer = plugin.get('onReducer')
        // reducerEnhancer = (reducer)=>{}      // 来自 ./plugin.js
        const extraReducers = plugin.get('extraReducers')  // {form:formReducer}
        /* const app = dva({
            extraReducers: {
            form: formReducer,
            },
        }); */

        // extraReducers 获取所有的额外的 reducers 集合 

        // 额外的 reducers 集合 不能与本身的冲突
        invariant(
            Object.keys(extraReducers).every(key => !(key in reducers)),
            `[app.start] extraReducers is conflict with other reducers, reducers list: ${Object.keys(
                reducers
            ).join(', ')}`
        )

        // Create store
        const store = (app._store = createStore({
            // eslint-disable-line
            reducers: createReducer(),
            initialState: hooksAndOpts.initialState || {},
            plugin,
            createOpts,
            sagaMiddleware,
            promiseMiddleware
        }))

        // Extend store
        store.runSaga = sagaMiddleware.run
        store.asyncReducers = {}

        // Execute listeners when state is changes
        const listeners = plugin.get('onStateChange')
        for (const listener of listeners) {
            store.subscribe(() => {
                listener(store.getState())
            })
        }

        // Run sagas
        sagas.forEach(sagaMiddleware.run)

        // Setup app
        setupApp(app)

        // Run subscriptions
        const unlisteners = {}
        // 取消subscription，如果subscription 返回一个函数
        for (const model of this._models) {
            if (model.subscriptions) {
                unlisteners[model.namespace] = runSubscription(
                    model.subscriptions,
                    model,
                    app,
                    onError
                )
            }
        }

        // Setup app.model and app.unmodel
        app.model = injectModel.bind(app, createReducer, onError, unlisteners)
        app.unmodel = unmodel.bind(app, createReducer, reducers, unlisteners)

        /**
         * Create global reducer for redux.
         *
         * @returns {Object}
         */
        function createReducer() {
            return reducerEnhancer(
                combineReducers({
                    ...reducers,
                    ...extraReducers,
                    ...(app._store ? app._store.asyncReducers : {})
                })
            )
        }
    }
}