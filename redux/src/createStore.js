import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'



// // redux自己创建的action，初始化状态树和reducer改变后初始化状态树
// export const ActionTypes = {
//     INIT: '@@redux/INIT'
// }


/**
 * Create a Redux store that holds the state tree
 * 创建一个保存状态树的 Redux 存储
 * The only way to change the data in the store is to call 'dispatch' on it
 * 唯一改变状态树中数据的方法是调用 dispatch
 * 
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 * 
 * 在应用中应该只有一个store ,为了指定状态树的不同部分如何响应 action ,
 * 你也许通过使用 combineReducers ,结合多个 reducers 使之成为一个单例的 reducer 函数 
 * 
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 * 返回状态树的下一个状态，给出当前的状态和如何处理 action
 * 
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * 初始状态树，可以选择性地指定它以通用应用程序中的服务器状态进行加密，或恢复先前序列化的用户会话
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 * 如果使用 combineReducers 来产生根 reducer函数，那么他必须是一个与 combineReducers键相同结构的对象
 * 
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`
 * 
 * 存储器增强器，可以通过指定第三方功能例如：中间件、时间旅行、坚持等来增强 store.Redux提供的唯一增强器是 applyMiddleware
 * enhancer 是一个组合的高阶函数，返回一个强化过的 store creator .这与 middleware相似，它也允许你通过复合函数改变 store 接口。
 * 
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 * 
 */

export default function createStore(reducer, preloadedState, enhancer) {

    // 查看是否有初始的状态传入
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState
        preloadedState = undefined
    }

    // 如果传入的是合法的 enhance，则调用这个函数，并传入 createStore
    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            // enhancer 必须是一个函数
            throw new Error('Expected the enhancer to be a function.')
        }

        // 调用 enhancer ,返回一个新强化过的 store creator
        return enhancer(createStore)(reducer, preloadedState)
    }

    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.')
    }

    let currentReducer = reducer
    let currentState = preloadedState
    let currentListeners = [] // 监听函数列表
    let nextListeners = currentListeners // 监听列表的一个引用
    let isDispatching = false // 是否正在分发事件

    /**
     * 保存一份订阅快照
     * @return {void}
     */

    function ensureCanMutateNextListeners() {
        // 判断 nextListeners 和 currentListeners 是同一个引用
        if (nextListeners === currentListeners) {
            // 通过数组的 slice 方法,复制出一个 listeners ,赋值给 nextListeners
            nextListeners = currentListeners.slice()
        }
    }

    /**
     * Reads the state tree managed by the store.
     * 
     * @return {any} The current state tree of your app
     */

    function getState() {
        if (isDispatching) {
            throw new Error(
                'You may not call store.getState() while the reducer is executing. ' +
                'The reducer has already received the state as an argument. ' +
                'Pass it down from the top reducer instead of reading it from the store.'
            )
        }
        return currentState
    }


    /**
     * Adds a change listener.It will be called any time an action is dispatched,
     * and some part of the state tree may poteneially have change.You may then call `getState` to 
     * read the current state tree inside the callback
     * 添加一个改变监听器。任何时候，当一个 action dispatch的时候都会被调用，
     * 并且状态树的某些部分可能会改变。你可以在回掉函数中来用 getstate 读取目前的 state
     * 
     * You may call `dispatch` from a change listener,with the following caveats:
     * 你可以在 listener 改变时调用 dispatch ,要注意：
     * 
     * 1. The subscriptions are snapshotted just before every `dispatch()` call.
     * If you subscribe or unsubscribe while the listeners are being invoked,
     * this will not have any effect on the `dispatch()` that is currently in progress. 
     * However, the next `dispatch()` recent snapshot of the subscription list.
     * 1.在每个`dispatch（）`调用之前，订阅都是快照。
     * 如果在调用监听器时订阅或取消订阅，那么这不会对当前正在进行的`dispatch（）'有任何影响。
     *  但是，下一个`dispatch（）`订阅列表的最新快照。
     * 
     * 2. The listener should not expect to see all state changes, 
     * as the state might have been updated multiple times during a nested `dispatch()` 
     * before the listener is called. It is, however, 
     * guaranteed that all subscribers registered before the `dispatch()` started 
     * will be called with the latest state by the time it exits.
     * 
     * 2.侦听器不应该期望看到所有的状态更改，
     * 因为状态可能在调用侦听器之前在嵌套的`dispatch（）'期间被多次更新。 
     * 但是，保证在“dispatch（）”开始前注册的所有用户将在退出时以最新状态调用。
     * 
     * @param {Function} listener A callback to be invoked on every dispatch.
     * 
     * @returns {Function} A function to remove this change listener.
     */

    function subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Expected listener to be a function')
        }

        if (isDispatching) {
            throw new Error(
                'You may not call store.subscribe() while the reducer is executing. ' +
                'If you would like to be notified after the store has been updated, subscribe from a ' +
                'component and invoke store.getState() in the callback to access the latest state. ' +
                'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
            )
        }

        let isSubscribed = true

        ensureCanMutateNextListeners()

        nextListeners.push(listener)

        return function unsubscribe() {
            if (!isSubscribed) {
                return
            }

            if (isDispatching) {
                throw new Error(
                    'You may not unsubscribe from a store listener while the reducer is executing. ' +
                    'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
                )
            }

            isSubscribed = false

            // 保存一下订阅快照
            ensureCanMutateNextListeners()

            // 找到当前的 listener
            const index = nextListeners.indexOf(listener)

            //移除当前的 listener
            nextListeners.splice(index, 1)
        }
    }

    /**
     * Dispatches an action. It is the only way to trigger a state change.
     * 
     * The `reducer` function, used to create the store, 
     * will be called with the current state tree and the given `action`. 
     * Its return value will be considered the **next** state of the tree, 
     * and the change listeners will be notified.
     * 用于创建 store 的 reducer 函数将使用当前的状态树和给定的 action 来调用，
     * 它的返回值将被视为树的 `下一个` 状态，并且通知更改监听器
     * 
     * the base implementation only supports plain object actions. 
     * If you want to dispatch a Promise, an Observable, a thunk, or something else,
     * you need to wrap your store creating function into the corresponding middleware. 
     * For example, see the documentation for the `redux-thunk` package. 
     * Even the middleware will eventually dispatch plain object actions using this method.
     * 
     * 基本实现仅支持简单对象操作（参数基本支持对象）。 
     * 如果要发送Promise，Observable，thunk或其他东西，
     * 则需要将 store 创建函数包装到相应的中间件中。 
     * 例如，请参阅`redux-thunk`包的文档。 
     * 即使中间件最终也将使用此方法调度纯对象操作。
     * 
     * @param {Object} action A plain object representing “what changed”. 
     * It is a good idea to keep actions serializable so you can record and replay user sessions, or use the time travelling `redux-devtools`. 
     * An action must have a `type` property which may not be `undefined`. 
     * It is a good idea to use string constants for action types.
     * 
     * @returns {Object} For convenience, the same action object you dispatched.
     * 为了方便，显示相同的 action
     * 
     * Note that, if you use a custom middleware, 
     * it may wrap `dispatch()` to return something else (for example, a Promise you can await).
     * 请注意，如果您使用自定义中间件，
     * 它可能会包装“dispatch（）”以返回其他内容（例如，异步的Promise）。
     */

    // 以下情况会报错
    // 1. 传入的action不是一个对象
    // 2. 传入的action是个对象,但是action.type 是undefined

    function dispatch(action) {
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            )
        }

        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            )
        }

        // 调用dispatch的时候只能一个个调用，通过dispatch判断调用的状态
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions')
        }
        /**
         * finally子句在try块和catch块之后执行但是在一个try声明之前执行. 
         * 无论是否有异常抛出它总是执行。 如果有异常抛出finally子句将会被执行，这个声明即使没有catch子句处理异常。
         */
        try {
            isDispatching = true
            currentState = currentReducer(currentState, action)
        } finally {
            isDispatching = false
        }

        // 每次dispatch结束之后，就执行监听队列中的监听函数
        // 将nextListeners赋值给currentListeners，保证下一次执行ensureCanMutateNextListeners方法的时候会重新拷贝一个新的副本，在unscribe()中可以重新形成新的快照
        // 使用for循环执行
        const listeners = (currentListeners = nextListeners)

        for (let i = 0; i < listeners.length; i++) {
            const listener = listener[i]
            listener()
        }

        return action
    }


    /**
     * Replaces the reducer currently used by the store to calculate the state.
     * 替换计算 state 的 reducer。
     * 
     * You might need this if your app implements code splitting and you want to
     * load some of the reducers dynamically. You might also need this if you
     * implement a hot reloading mechanism for Redux.
     *
     * 只有在你需要实现代码分隔，而且需要立即加载一些 reducer 的时候才可能会用到它。
     * 在实现 Redux 热加载机制的时候也可能会用到。
     * @param {Function} nextReducer The reducer for the store to use instead.
     * store 要用的下一个 reducer.
     * @returns {void}
     */



    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.')
        }
        // 当前传入的 nextReducer 赋值给 currentReducer
        currentReducer = nextReducer

        dispatch({
            type: ActionTypes.REPLACE
        })
    }

    /**
     * Interoperability point for observable/reactive libraries
     * 可观察/反应库的互操作性点
     * 
     * @returns {observable} A minimal observable of state changes.
     * 状态变化的最小观察。
     */

    function observable() {
        // 前面的订阅函数 subscribe
        const outerSubscribe = subscribe

        return {
            /**
             * The minimal observable subscription method.
             * 最小可观察的订阅方法
             * @param {Object} observer Any object that can be used as an observer
             * The observer object should have a `next` method.
             * 
             * @returns {subscription} An object with an `unsubscribe` method that can
             * be used to unsubscribe the observable from the store, and prevent further
             * emission of values from the observable.
             * 具有“取消订阅”方法的对象可用于取消订阅 store 中的可观察值，并防止从可观察者进一步排放值。
             */

            subscribe(observer) {
                // observer 是一个对象
                if (typeof observer !== 'object') {
                    throw new TypeError('Expected the observer to be an object.')
                }

                function observeState() {
                    if (observer.next) {
                        observer.next(getState())
                    }
                }

                observeState()

                const unsubscribe = outerSubscribe(observeState)

                return {
                    unsubscribe
                }
            },

            [$$observable]() {
                return this
            }
        }
    }

    // When a store is created, an "INIT" action is dispatched so that every
    // reducer returns their initial state. This effectively populates
    // the initial state tree.
    // 创建存储时，将调度“INIT”操作，以使每个reducer返回其初始状态。 这有效地填充了初始状态树。
    // redux.createStore(reducer, initialState) 的时候, 内部会 自己调用 dispatch({ type: ActionTypes.INIT });
    // 来完成state的初始化
    dispatch({
        type: ActionTypes.INIT
    })

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer, // Redux热加载的时候可以替换 Reducer
        [$$observable]: observable // 对象的私有属性，供内部使用
    }
}