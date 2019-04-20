import {
    initMixin
} from './init'
import {
    stateMixin
} from './state'
import {
    renderMixin
} from './render'
import {
    eventsMixin
} from './events'
import {
    lifecycleMixin
} from './lifecycle'
import {
    warn
} from '../util/index'


function Vue(options) {
    // 确保通过 new 实例化
    if (process.env.NODE_ENV !== 'production' &&
        !(this instance Vue)) {
        warn('Vue is a constructor and should be called with the `new` keyword')
    }

    // 初始化Vue
    this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)


export default Vue