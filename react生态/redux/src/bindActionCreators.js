import warning from './utils/warning'

function bindActionCreator(actionCreator, dispatch) {
    return (...args) => dispatch(actionCreator(...args))
}

/**
 * 结合 react-redux 中有如下用法：
 * function mapDispatchToProps(dispatch) {
 *      return bindActionCreators(CounterActions, dispatch)
 * }
 * 
 * 这里的 CounterActions 有很多形式，如：
 *1.  export const DECREMENT_COUNTER = 'DECREMENT_COUNTER'
 * 
 * 
 *2.    export function increment() {
	        return {
		        type: INCREMENT_COUNTER
	        }
        }


  3.    export function incrementIfOdd() {
	        return (dispatch, getState) => { // 这里 dispatch 一个函数时，就可能要用到 redux-thunk 模块等，因为直接dispath 函数会报错
		    //获取state对象中的counter属性值
		        const {
			        counter
		        } = getState()

		        //偶数则返回
		        if (counter % 2 === 0) {
			        return
		        }
		        //没有返回就执行加一
		        dispatch(increment())
	        }
        }


    此时 actionCreators 就是一个对象，
    actionCreators={
        ... 
    }

    bindActionCreators期望收到的是函数或者是对象，但是对象里面的每个键值都是函数，，否则会警告


    最终返回 boundAcionCreators，以上面为例，结果如下：

    boundAcionCreators={

        increment:(...args) => dispatch(increment(...args)),

        
        incrementIfOdd:(...args) => dispatch(incrementIfOdd(...args)),
    }
 * 
 */
export default function bindActionCreators(actionCreators, dispatch) {
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch)
    }

    if (typeof actionCreators !== 'object' || actionCreators === null) {
        throw new Error(
            `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
            `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
        )
    }

    // 遍历 actionCreators 对象
    const keys = Object.keys(actionCreators)
    const boundAcionCreators = {}
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const actionCreator = actionCreators[key]
        if (typeof actionCreator === 'function') {
            boundAcionCreators[key] = bindActionCreator(actionCreator, dispatch)
        } else {
            warning(`bindActionCreators expected a function actionCreator for key '${key}', instead received type '${typeof actionCreator}'.`)
        }
    }

    return boundAcionCreators
}