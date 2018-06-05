import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'


export default function createStore(reducer, preloadedState, enhancer) {
    // createStore(reducer,funciton enhancerFn(){})的情形
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState
        preloadedState = undefined
    }

    // enhancer 如果存在必须是函数
    // 编程想法：判断一个参数必须为某一类型时的思维
    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.')
        }

        return enhancer(createStore)(reducer, preloadedState)

        // enhancer = createStore => {
        //     return (reducer, preloadedState) => {
        //         createStore(reducer, preloadedState)
        //     }
        // }
    }



    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.')
    }


    let currentReducer = reducer
    let currentState = preloadedState
    let currentListeners = []
    let nextListeners = currentListeners
    let isDispatching = false

    // ======================================
    function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
            nextListeners = currentListeners.slice()
        }
    }


    function getState() {
        // 不能再reducer执行的时候获取state
        if (isDispatching) {
            throw new Error(
                'You may not call store.getState() while the reducer is executing. ' +
                'The reducer has already received the state as an argument. ' +
                'Pass it down from the top reducer instead of reading it from the store.'
            )
        }

        return currentState
    }


    function subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Expected the listener to be a function.')
        }

        if (isDispatching) {
            throw new Error(
                'You may not call store.subscribe() while the reducer is executing. ' +
                'If you would like to be notified after the store has been updated, subscribe from a ' +
                'component and invoke store.getState() in the callback to access the latest state. ' +
                'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
            )
        }

        let isSubscribed = true
        ensureCanMutateNextListeners()

        nextListeners.push(listener)

        return function unsubscribe() {
            // 防止重复取消订阅
            if (!isSubscribed) {
                return
            }

            if (isDispatching) {
                throw new Error(
                    'You may not unsubscribe from a store listener while the reducer is executing. ' +
                    'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
                )
            }

            isSubscribed = false
            ensureCanMutateNextListeners()

            // 从订阅者列表中删除该取消订阅的订阅者
            const index = nextListeners.indexOf(listener)
            nextListeners.splice(index, 1)
        }
    }


    function dispatch(action) {
        // action 必须是纯对象
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            )
        }

        // action 必须有type 属性
        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            )
        }


        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.')
        }

        // 思想：使用 try...finally 能够保证在函数执行完后做一些额外的操作
        try {
            isDispatching = true
            currentState = currentReducer(currentState, action)
        } finally {
            isDispatching = false
        }

        const listeners = (currentListeners = nextListeners)
        for (let i = 0; i < listeners.length; i++) {
            // ????????????????????????????????
            // 这里为什么不直接 listeners[i]() 
            // ????????????????????????????????
            const listener = listeners[i]
            listener()
        }

        return action
    }



    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.')
        }

        currentReducer = nextReducer
        dispatch({
            type: ActionTypes.replaceReducer
        })
    }


    function observable() {
        const outerSubscribe = subscribe

        return {
            subscribe(observer) {
                if (typeof observer !== 'object' || observer === null) {
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

    // 一开始就先dispatch 一个各个reducer都没有的对应的action 从而使得各个reducer 返回默认的state，以便于构建最初的状态树
    // 各个state 会不会有重复而导致合并的问题？？？？？？？？？？？
    dispatch({
        type: ActionTypes.INIT
    })

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        [$$observable]: observable
    }
}