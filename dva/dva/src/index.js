import React from 'react'
import invariant from 'invariant'
import createHashHistory from 'history/createHashHistory'
import {
    routerMiddleware,
    routerReducer as routing
} from 'react-router-redux'

import document from 'global/document'
import { Provider } from 'react-redux'
import * as core from 'dva-core'
import { isFunction } from 'dva-core/lib/utils'


// opts包含：
// history：指定给路由用的 history，默认是 hashHistory
// initialState：指定初始数据，优先级高于 model 中的 state，默认是 {}
// opts 里也可以配所有的 hooks ，下面包含全部的可配属性：
/* const app = dva({
    history,
    initialState,
    onError,
    onAction,
    onStateChange,
    onReducer,
    onEffect,
    onHmr,
    extraReducers,
    extraEnhancers,
  }); */


export default function (opts = {}) {
    const history = opts.history || createHashHistory
    const createOpts = {
        initialReducer: {
            routing
        },
        setupMiddlewares(middlewares) {
            return [
                routerMiddleware(history),
                ...middlewares
            ]
        },
        setupApp(app) {
            app._history = patchHistory(history)
        }
    }
    const app = core.create(opts, createOpts)
    // 保存之前的 start，在执行该函数之前要先挂载到 DOM 元素
    const oldAppStart = app.start

    app.router = router
    app.start = start
    return app

    function router(router) {
        invariant(
            isFunction(router),
            `[app.router] router should be function, but got ${typeof router}`,
        )

        app._router = router
    }

    function start(container) {
        // 允许 container 是字符串，然后用 querySelector 找元素
        // app.start('#root')
        if (isString(container)) {
            container = document.querySelector(container)
            invariant(
                container,
                `[app.start] container ${container} not found`,
            )
        }

        // 并且是 HTMLElement
        invariant(
            !container || isHTMLElement(container),
            `[app.start] container should be HTMLElement`,
        )

        // 路由必须注册
        invariant(
            app._router,
            `[app.start] router must be registered before app.start()`,
        )

        if (!app._store) {
            // 此时 app._store = null
            // 所以触发这里
            oldAppStart.call(app)
        }

        // export _getProvider for HMR
        // ref: https://github.com/dvajs/dva/issues/469
        const store = app._store
        app._getProvider = getProvider.bind(null, store, app)


        // If has container, render; else, return react component
        // 不加 container -> 常见场景有测试、node 端、react-native 和 i18n 国际化支持
        if (container) {
            render(container, store, app, app._router)      // react 进行渲染
            // 触发 onHmr 钩子函数，并把 render 函数作为参数传入 onHmr 钩子对应数组里的所有函数
            app._plugin.apply('onHmr')(render.bind(null, container, store, app))
        } else {
            return getProvider(store, this, this._router)
        }
    }
}

function isHTMLElement(node) {
    return typeof node === 'object' && node !== null
}


function isString(str) {
    return typeof str === 'string'
}

function getProvider(store, app, router) {
    // 返回函数式组件
    const DvaRoot = extraProps => (
        <Provider store={store}>
            {router({ app, history: app._history, ...extraProps })}
        </Provider>
    )

    return DvaRoot
}


function render(container, store, app, router) {
    const ReactDOM = require('react-dom')
    ReactDOM.render(React.createElement(getProvider(store, app, router)), container)
}


function patchHistory(history) {
    const oldListen = history.oldListen
    history.listen = callback => {
        callback(history.location)
        return oldListen.call(history, callback)
    }
    return history
}