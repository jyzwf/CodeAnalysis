import connectAdvanced from '../components/connectAdvanced'
import shallowEqual from '../utils/shallowEqual'
import defaultMapDispatchToPropsFactories from './mapDispatchToProps'
import defaultMapStateToPropsFactories from './mapStateToProps'
import defaultMergePropsFactories from './mergeProps'
import defaultSelectorFactory from './selectorFactory'


function match(arg, factories, name) {
    for (let i = factories.length - 1; i >= 0; i--) {
        const result = factories[i](arg)
        if (result) return result
    }

    return (dispatch, options) => {
        throw new Error(`Invalid value of type ${typeof arg} for ${name} argument when connecting component ${options.wrappedComponentName}.`)
    }
}


function strictEqual(a, b) { return a === b }


export function createConnect({
    connectHOC = connectAdvanced,
    mapStateToPropsFactories = defaultMapStateToPropsFactories,
    mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories,
    mergePropsFactories = defaultMergePropsFactories,
    selectorFactory = defaultSelectorFactory
} = {}) {
    return function connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps,
        {
            pure = true,
            areStatesEqual = strictEqual,
            areOwnPropsEqual = shallowEqual,
            areStatePropsEqual = shallowEqual,
            areMergedPropsEqual = shallowEqual,
            ...extraOptions = {}
        }
    ) {
        const initMapStateToProps = match(mapStateToProps, mapStateToPropsFactories, 'mapStateToProps')
        const initMapDispatchToProps = match(mapDispatchToProps, mapDispatchToPropsFactories, 'mapDispatchToProps')
        const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')

        return connectHOC(
            selectorFactory,
            {
                methodName: 'connect',
                getDisplayName: name => `Connect(${name})`,
                shouldHandleStateChanges: Boolean(mapStateToProps), // 这里如果不传mapStateToProps就不监听store的change
                initMapStateToProps,
                initMapDispatchToProps,
                initMergeProps,
                pure,
                areStatesEqual,
                areOwnPropsEqual,
                areStatePropsEqual,
                areMergedPropsEqual,

                ...extraOptions
            }
        )
    }
}

export default createConnect()