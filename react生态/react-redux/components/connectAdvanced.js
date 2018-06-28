import hoistStatics from 'hoist-non-react-statics'
import invariant from 'invariant'
import { Component, createElement } from 'react'

import Subscription from '../utils/Subscription'
import { storeShape, subscriptionShape } from '../utils/PropTypes'

let hotReloadingVersion = 0
const dummyState = {}
function noop() { }

function makeSelectorStateful(sourceSelector, store) {
    // wrap the selector in an object that tracks its results between runs.
    const selector = {
        run: function runComponentSelector(props) {
            try {
                const nextProps = sourceSelector(store.getState(), props)

                if (nextProps !== selector.props || selector.error) {
                    selector.shouldComponentUpdate = true
                    selector.props = nextProps
                    selector.error = null
                }
            } catch (error) {
                selector.shouldComponentUpdate = true
                selector.error = error
            }
        }
    }

    return selector
}


// export default connectAdvanced((dispatch, options) => (state, props) => ({
//     thing: state.things[props.thingId],
//     saveThing: fields => dispatch(actionCreators.saveThing(props.thingId, fields)),
//   }))(YourComponent)

export default function connectAdvanced(
    selectorFactory,
    {
        getDisplayName = name => `ConnectAdvanced(${name})`,

        methodName = 'connectAdvanced',

        renderCountProp = undefined,

        // 高阶组件是否订阅store的change
        shouldHandleStateChanges = true,

        storeKey = 'store',

        // 如果为true,高阶组件将通过 getWrappedInstance 方法来暴露被包裹的组件
        withRef = false,

        // 其他一些可选项
        ...connectOptions
    } = {}
) {
    const subscriptionKey = storeKey + 'Subscription'
    const version = hotReloadingVersion++

    const contextTypes = {
        [storeKey]: storeShape,
        [subscriptionKey]: subscriptionShape,
    }
    const childContextTypes = {
        [subscriptionKey]: subscriptionShape,
    }


    return function wrapWithConnect(WrappedComponent) {
        invariant(
            typeof WrappedComponent == 'function',
            `You must pass a component to the function returned by ` +
            `${methodName}. Instead received ${JSON.stringify(WrappedComponent)}`
        )

        const wrappedComponentName = WrappedComponent.displayName
            || WrappedComponent.name
            || 'Component'

        const displayName = getDisplayName(wrappedComponentName)

        const selectorFactoryOptions = {
            ...connectOptions,
            getDisplayName,
            methodName,
            renderCountProp,
            shouldHandleStateChanges,
            storeKey,
            withRef,
            displayName,
            wrappedComponentName,
            WrappedComponent
        }

        class Connect extends Component {
            constructor(props, context) {
                super(props, context)

                this.version = version
                this.state = {}
                this.renderCount = 0
                this.store = props[storeKey] || context[storeKey]
                this.propsMode = Boolean(props[storeKey])
                this.setWrappedInstance = this.setWrappedInstance.bind(this)

                invariant(this.store,
                    `Could not find "${storeKey}" in either the context or props of ` +=
                    `"${displayName}". Either wrap the root component in a <Provider>, ` +
                    `or explicitly pass "${storeKey}" as a prop to "${displayName}".`
                )

                this.initSelector()
                this.initSubscription()
            }

            getChildContext() {
                const subscription = this.propsMode ? null : this.subscription
                return { [subscriptionKey]: subscription || this.context[subscriptionKey] }
            }

            componentDidMount() {
                if (!shouldHandleStateChanges) return

                this.subscription.trySubscribe()
                this.selector.run(this.props)

                if (this.selector.shouldHandleStateChanges) this.forceUpdate()
            }

            componentWillReceiveProps(nextProps) {
                this.selector.run(nextProps)
            }

            shouldComponentUpdate() {
                return this.selector.shouldComponentUpdate
            }

            componentWillUnmount() {
                if (this.subscription) this.subscription.tryUnsubscribe()
                this.subscription = null
                this.notifyNestedSubs = noop
                this.store = null
                this.selector.run = noop
                this.selector.shouldComponentUpdate = false
            }

            getWrappedInstance() {
                invariant(withRef,
                    `To access the wrapped instance, you need to specify ` +
                    `{ withRef: true } in the options argument of the ${methodName}() call.`
                )
                return this.wrappedInstance
            }

            setWrappedInstance(ref) {
                this.wrappedInstance = ref
            }

            initSelector() {
                const sourceSelector = selectorFactory(this.store.dispatch, selectorFactoryOptions)
                this.selector = makeSelectorStateful(sourceSelector, this.store)
                this.selector.run(this.props)
            }

            initSubscription() {
                if (!shouldHandleStateChanges) return

                const parentSub = (this.propsMode ? this.props : this.context)[subscriptionKey]
                this.subscription = new Subscription(this.store, parentSub, this.onStateChange.bind(this))

                this.notifyNestedSubs = this.subscription.notifyNestedSubs.bind(this.subscription)
            }

            onStateChange() {
                this.selector.run(this.props)

                if (!this.selector.shouldComponentUpdate) {
                    this.notifyNestedSubs()
                } else {
                    this.componentDidUpdate = this.notifyNestedSubsOnComponentDidUpdate
                    this.setState(dummyState)
                }
            }

            notifyNestedSubsOnComponentDidUpdate() {
                this.componentDidUpdate = undefined
                this.notifyNestedSubs()
            }

            isSubscribed() {
                return Boolean(this.subscription) && this.subscription.isSubscribed()
            }

            addExtraProps(props) {
                // this.propsMode && this.subscription 两者为何放在一起判断
                if (!withRef && !renderCountProp && !(this.propsMode && this.subscription)) return props

                // 保持引用，防止被垃圾回收机制回收
                const withExtras = { ...props }
                if (withRef) withExtras.ref = this.setWrappedInstance
                if (renderCountProp) withExtras[renderCountProp] = this.renderCount++
                if (this.propsMode && this.subscription) withExtras[subscriptionKey] = this.subscription
                return withExtras
            }

            render() {
                const selector = this.selector
                selector.shouldComponentUpdate = false

                if (selector.error) {
                    throw selector.error
                } else {
                    return createElement(WrappedComponent, this.addExtraProps(selector.props))
                }

            }
        }

        Connect.WrappedComponent = WrappedComponent
        Connect.displayName = displayName
        Connect.childContextTypes = childContextTypes
        Connect.contextTypes = contextTypes
        Connect.propTypes = contextTypes

        if (process.env.NODE_ENV !== 'production') {
            Connect.prototype.componentWillUpdate = function componentWillUpdate() {
                // We are hot reloading!
                if (this.version !== version) {
                    this.version = version
                    this.initSelector()

                    // If any connected descendants don't hot reload (and resubscribe in the process), their
                    // listeners will be lost when we unsubscribe. Unfortunately, by copying over all
                    // listeners, this does mean that the old versions of connected descendants will still be
                    // notified of state changes; however, their onStateChange function is a no-op so this
                    // isn't a huge deal.
                    let oldListeners = [];

                    if (this.subscription) {
                        oldListeners = this.subscription.listeners.get()
                        this.subscription.tryUnsubscribe()
                    }
                    this.initSubscription()
                    if (shouldHandleStateChanges) {
                        this.subscription.trySubscribe()
                        oldListeners.forEach(listener => this.subscription.listeners.subscribe(listener))
                    }
                }
            }
        }

        return hoistStatics(Connect, WrappedComponent)

    }
}