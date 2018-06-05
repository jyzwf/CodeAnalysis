import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

function getUndefinedStateErrorMessage(key, action) {
    const actionType = action && action.type
    const actionDescription =
        (actionType && `action "${String(actionType)}"`) || 'an action'

    return (
        `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
        `To ignore an action, you must explicitly return the previous state. ` +
        `If you want this reducer to hold no value, you can return null instead of undefined.`
    )
}


function getUnexpectedStateShapeWarningMessage(
    inputState,
    reducers,
    action,
    unexpectedKeyCache
) {
    const reducerKeys = Object.keys(reducers)
    const argumentName =
        action && action.type === ActionTypes.INIT ?
        'preloadedState argument passed to createStore' :
        'previous state received by the reducer'

    // 传入的reducers 必须是键值对，不能为空对象
    // 为什么不一开始就检测？？？？
    if (reducerKeys.length === 0) {
        return (
            'Store does not have a valid reducer. Make sure the argument passed ' +
            'to combineReducers is an object whose values are reducers.'
        )
    }

    if (!isPlainObject(inputState)) {
        return (
            `The ${argumentName} has unexpected type of "` + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
            `". Expected argument to be an object with the following ` +
            `keys: "${reducerKeys.join('", "')}"`
        )
    }


    const unexpectedKeys = Object.keys(inputState).filter(
        // reducers 本身没有改key ，也许是继承而来，并且在unexpectedKeyCache缓存中没有该key
        key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
    )

    unexpectedKeys.forEach(key => {
        unexpectedKeyCache[key] = true
    })

    if (action && action.type === ActionTypes.REPLACE) return

    // state 里面的每一个 subState 必须要在reducers 里面有对应的reducer，否则会被忽略
    if (unexpectedKeys.length > 0) {
        return (
            `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
            `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
            `Expected to find one of the known reducer keys instead: ` +
            `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
        )
    }
}



function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(key => {
        const reducer = reducers[key]
        const initialState = reducer(undefined, {
            type: ActionTypes.INIT
        })
        // 在初始化的时候必须返回一个初始状态或者null
        // 对于createStore 里的dispatch({type: ActionTypes.INIT})
        if (typeof initialState === 'undefined') {
            throw new Error(
                `Reducer "${key}" returned undefined during initialization. ` +
                `If the state passed to the reducer is undefined, you must ` +
                `explicitly return the initial state. The initial state may ` +
                `not be undefined. If you don't want to set a value for this reducer, ` +
                `you can use null instead of undefined.`
            )
        }


        // 随机一个action 必须有返回一个初始状态或者null
        if (
            typeof reducer(undefined, {
                type: ActionTypes.PROBE_UNKNOWN_ACTION()
            }) === 'undefined'
        ) {
            throw new Error(
                `Reducer "${key}" returned undefined when probed with a random type. ` +
                `Don't try to handle ${
                    ActionTypes.INIT
                  } or other actions in "redux/*" ` +
                `namespace. They are considered private. Instead, you must return the ` +
                `current state for any unknown actions, unless it is undefined, ` +
                `in which case you must return the initial state, regardless of the ` +
                `action type. The initial state may not be undefined, but can be null.`
            )
        }
    })
}

export default function combineReducers(reducers) {
    const reducerKeys = Object.keys(reducers)
    const finalReducers = {}

    // 第一层过滤：去除只提供reducer名，没有具体reducer 函数的reducer
    for (let i = o; i < reducerKeys.length; i++) {
        const key = reducerKeys[i]

        // combineReducers({
        //     todo() {},
        //     undo
        // })
        if (process.env.NODE_ENV !== 'production') {
            // 只提供了reducer 名，没有具体的函数提供
            if (typeof reducers[key] === 'undefined') {
                warning(`No reducer provided for key "${key}"`)
            }
        }

        if (typeof reducers[key] === 'function') {
            finalReducers[key] = reducerKeys[key]
        }
    }


    const finalReducerKeys = Object.keys(finalReducers)

    let unexpectedKeyCache
    if (process.env.NODE_ENV !== 'production') {
        unexpectedKeyCache = {}
    }

    let shapeAssertionError
    try {
        // 这里验证每个reducer 在初始化或者随机不存在的action下的时候必须返回一个默认的State或者null
        assertReducerShape(finalReducers)
    } catch (e) {
        // 捕获错误
        shapeAssertionError = e
    }


    return function combination(state = {}, action) {
        if (shapeAssertionError) { //有错误直接抛出     ->  为何不在上面一步就抛出？？？
            throw shapeAssertionError
        }

        if (process.env.NODE_ENV !== 'production') {
            const warningMessage = getUnexpectedStateShapeWarningMessage(
                state,
                finalReducers,
                action,
                unexpectedKeyCache
            )

            if (warningMessage) {
                warning(warningMessage)
            }
        }


        let hasChanged = false
        const nextState = {}

        for (let i = 0; i < finalReducerKeys.length; i++) {
            const key = finalReducerKeys[i]
            const reducer = finalReducerKeys[key]
            const previousStateForKey = state[key]


            // state = {
            //     a:{},
            //     b:true,
            //     c:1
            // }

            // reducers = {
            //     d(state={},action){},
            //     e(){state,action}
            // }

            // nextStateForKey = d(undefined,action)  ---> return 一个state
            // 所以会忽略state 中在reducers 中没有出现的state，然后重新生成每个reducer 的 key 的state，最后组成一个新的 state

            // action 会触发多个 reducer 里的相同的 action，从而返回新的 state
            // 这里可否将每个state 相同的 action switch 收集起来，从而集中进行 action 的触发？？？？？
            const nextStateForKey = reducer(previousStateForKey, action)

            if (typeof nextStateForKey === 'undefined') { // 有对应的action 但是返回的确实undefined
                const errorMessage = getUndefinedStateErrorMessage(key, action)
                throw new Error(errorMessage)
            }

            nextState[key] = nextStateForKey
            // 只要有一个state 改变就改变根状态树
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey
        }

        return hasChanged ? nextState : state
    }
}