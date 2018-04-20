import invariant from 'invariant'

const identify = _ => _

function handleAction(actionType, reducer = identify) {
    return (state, action) => {
        const { type } = action
        invariant(type, 'dispatch: action should be a plain Object with type')

        if (actionType === type) {
            return reducer(state, action)
        }

        return state
    }
}

// 666666666666666666666666666666666666666
function reduceReducers(...reducers) {
    return (previous, current) =>
        reducers.reduce((p, r) => r(p, current), previous)
}

function handleActions(handlers, defaultState) {
    // handlers 就是传进来的 reducers
    /* {
        reducers: {
            add(state){ },
            minus(state){ }
        }
    } */
    const reducers = Object.keys(handlers).map(type =>
        handleAction(type, handlers[type])
    )

    /* reducers=[
        (state, action)=>{},
        (state, action)=>{}        
    ] */

    const reducer = reduceReducers(...reducers)
    // reducer = (previous,current)=>{}

    return (state = defaultState, action) => reducer(state, action)
}

export default handleActions