import verifyPlainObject from '../utils/verifyPlainObject'

export function wrapMapToPropsConstant(getConstant) {
    return function initConstantSelector(dispatch, options) {
        const constant = getConstant(dispatch, options)

        function constantSelector() { return constant }

        constantSelector.dependsOnOwnProps = false
        return constantSelector
    }
}


export function getDependsOnOwnProps(mapToProps) {
    return (mapToProps.dependsOnOwnProps !== null && mapToProps.dependsOnOwnProps !== undefined)
        ? Boolean(mapToProps.dependsOnOwnProps)
        : mapToProps.length !== 1
}


export function wrapMapToPropsFunc(mapToProps, methodName) {
    return function initProxySelector(dispatch, { displayName }) {
        const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
            return proxy.dependsOnOwnProps
                ? proxy.mapToProps(stateOrDispatch, ownProps)
                : proxy.mapToProps(stateOrDispatch)
        }


        proxy.dependsOnOwnProps = true

        proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
            proxy.mapToProps = mapToProps   // 第一次调用时，将 mapToProps 修改为 mapStateToProps、mapDispatchToProps、mergeProps
            // mapStateToProps(state, [ownProps]) ：是否引入 ownProps，见：http://cn.redux.js.org/docs/react-redux/api.html
            proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)      // 是否依赖
            let props = proxy(stateOrDispatch, ownProps)    // 根据是否传入 ownProps 再次执行 mapToProps  -> 666666666666

            if (typeof props === 'function') {  // 结果是函数，就继续将该函数作为 mapToProps执行，
                proxy.mapToProps = props
                proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
                props = proxy(stateOrDispatch, ownProps)
            }

            if (process.env.NODE_ENV !== 'production')
                verifyPlainObject(props, displayName, methodName)

            return props
        }

        return proxy
    }
}