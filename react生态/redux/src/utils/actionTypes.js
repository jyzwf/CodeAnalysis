/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 * 这些是Redux保留的私有 action 类型
 * 对于任何不知道的 action，你必须返回一个当前的 state
 * 如果当前的 state是 undefined ,必须返回初始的 state
 * 不要直接在代码中引用这些 action
 */
const ActionTypes = {
    INIT: '@@redux/INIT' +
        Math.random()
        .toString(36)
        .substring(7)
        .split('')
        .join('.'),
    REPLACE: '@@redux/REPLACE' +
        Math.random()
        .toString(36)
        .substring(7)
        .split('')
        .join('.')
}

export default ActionTypes