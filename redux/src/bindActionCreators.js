import warning from './utils/warning'

function bindActionCreator(actionCreator, dispatch) {
    return (...args) => dispatch(actionCreator(...args))
}

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