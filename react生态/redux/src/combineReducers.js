import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

// 还记得combineReducers的黑魔法吗？即：

// 传入的Object参数中，对象的key与value所代表的reducer function同名

// 各个reducer function的名称和需要传入该reducer的state参数同名。


function getUndefinedStateErrorMessage(key, action) {
    const actionType = action && action.type
    const actionName = (actionType && `"${actionType.toString()}"`) || 'an action'

    return (
        `Given action ${actionName}, reducer "${key}" returned undefined. ` +
        `To ignore an action, you must explicitly return the previous state. ` +
        `If you want this reducer to hold no value, you can return null instead of undefined.`
    )
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
    const reducerKeys = Object.keys(reducers)
    const argumentName = action && action.type === ActionTypes.INIT ?
        'preloadedState argument passed to createStore' :
        'previous state received by the reducer'

    if (reducerKeys.length === 0) {
        return (
            'Store does not have a valid reducer. Make sure the argument passed ' +
            'to combineReducers is an object whose values are reducers.'
        )
    }

    if (!isPlainObject(inputState)) { // inputState 不是纯对象
        return (
            `The ${argumentName} has unexpected type of "` +
            ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
            `". Expected argument to be an object with the following ` +
            `keys: "${reducerKeys.join('", "')}"`
        )
    }

    // reducers 里的key 在 state 的keys值中没有对应的，即对应上面的魔法2
    const unexpectedKeys = Object.keys(inputState).filter(key =>
        !reducers.hasOwnProperty(key) &&
        !unexpectedKeyCache[key]
    )

    unexpectedKeys.forEach(key => {
        unexpectedKeyCache[key] = true
    })

    // 如果有上述的key ，则报错
    if (unexpectedKeys.length > 0) {
        return (
            `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
            `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
            `Expected to find one of the known reducer keys instead: ` +
            `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
        )
    }
}

// 对每个reducer做合法性检测
// store = Redux.createStore(reducer, initialState) -->
// currentState = initialState
// currentState = currentReducer(currentState, action);
//
// 从调用关系,调用时机来看, store.getState() 的初始值(currentState)
// 为 currentReducer(initialState, { type: ActionTypes.INIT })
//
// 1. 在初始化阶段,reducer 传入的 state 值是 undefined,此时,需要返回初始state,且初始state不能为undefined
// 2. 当传入不认识的 actionType 时, reducer(state, {type}) 返回的不能是undefined
// 3. redux/ 这个 namespace 下的action 不应该做处理,直接返回 currentState 就行

// reducer一定不能返回 underfined，要设置默认值
function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(key => {
        const reducer = reducers[key]
        // 遍历全部reducer，并给它传入(undefined, action)
        // 当第一个参数传入undefined时，则为各个reducer定义的默认参数
        const initialState = reducer(undefined, {
            type: ActionTypes.INIT
        })

        // ActionTypes.INIT几乎不会被定义，所以会通过switch的default返回reducer的默认参数。如果没有指定默认参数，则返回undefined，抛出错误
        if (typeof initialState === 'undefined') {
            // 如果这个值是undefined，则抛出错误，因为初始state不应该是undefined
            throw new Error(
                `Reducer "${key}" returned undefined during initialization. ` +
                `If the state passed to the reducer is undefined, you must ` +
                `explicitly return the initial state. The initial state may ` +
                `not be undefined. If you don't want to set a value for this reducer, ` +
                `you can use null instead of undefined.`
            )
        }

        // 当遇到一个不知道的action的时候，reducer也不能返回undefined，否则也会抛出报错
        const type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')

        if (typeof reducer(undefined, {
                type
            }) === 'undefined') {
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

/** 
 *  const todoApp = combineReducers({
      visibilityFilter,
      todos
    })
 */
export default function combineReducers(reducers) {
    // 第一次筛选，筛选掉reducers中键值不是function的条目
    // reducers为obj
    const reducerKeys = Object.keys(reducers)
    // 定义一个最终要返回的reducers对象
    const finalReducers = {}

    for (let i = 0; i < reducerKeys.length; i++) {
        const key = reducerKeys[i]

        // 开发环境下给出提醒
        if (process.env.NODE_ENV !== 'production') {
            if (typeof reducers[key] === 'undefined') {
                warning(`No reducer provided for key "${key}"`)
            }
        }
        // 相应key的值是个函数，则将改函数缓存到finalReducers中
        if (typeof reducers[key] === 'function') {
            finalReducers[key] = reducers[key]
        }
    }

    // 二次筛选，判断reducer中传入的值是否合法（!== undefined）
    // 获取筛选完之后的所有key  
    const finalReducersKeys = Object.keys(finalReducers)

    let unexpectedKeyCache
    if (process.env.NODE_ENV !== 'production') {
        unexpectedKeyCache = {}
    }

    // 用于缓存错误对象
    let shapeAssertionError
    try {
        // 对所有的子reducer 做一些合法性断言,如果没有出错再继续下面的处理
        // 合法性断言的内容,见API注释
        assertReducerShape(finalReducers)
    } catch (e) {
        shapeAssertionError = e
    }

    return function combination(state = {}, action) {
        if (shapeAssertionError) { // 有错直接抛出
            throw shapeAssertionError
        }

        // 判断该 action 对应的 reducer 是否有返回值
        if (process.env.NODE_ENV !== 'production') {
            const warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
            if (warningMessage) {
                warning(warningMessage)
            }
        }

        // state 是否有改变
        let hasChanged = false
        // 改变后的state
        const nextState = {}

        for (let i = 0; i < finalReducersKeys.length; i++) {
            const key = finalReducersKeys[i]
            const reducer = finalReducers[key]
            const previousStateForKey = state[key]
            const nextStateForKey = reducer(previousStateForKey, action)
            // 其中一个 reducer 返回的是undefined,抛出错误
            if (typeof nextStateForKey === 'undefined') {
                const errorMessage = getUndefinedStateErrorMessage(key, action)
                throw new Error(errorMessage)
            }

            nextState[key] = nextStateForKey
            // 是否改变了state
            // 只要有一个变了，就刷新状态
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey
        }

        return hasChanged ? nextState : state
    }
}