/* @flow */

import {
    no,
    noop,
    identity
} from 'shared/util'

// 引入事件循环
import {
    LIFECYCLE_HOOKS
} from 'shared/constants'

export type Config = {
    // user 
    optionMergeStrategies: { [key: string]: Function };
    silent: boolean;
    productionTip: boolean;
    performance: boolean;
    devtools: boolean;
    errorHandler: ?(err: Error, vm: Component, info: string) => void;
    ignoredElements: Array<string>;
    keyCodes: { [key: string]: number | Array<number> };

     // platform
    isReservedTag: (x?: string) => boolean;
    isReservedAttr: (x?: string) => boolean;
    parsePlatformTagName: (x: string) => string;
    isUnknownElement: (x?: string) => boolean;
    getTagNamespace: (x?: string) => string | void;
    mustUseProp: (tag: string, type: ?string, name: string) => boolean;

    _lifecycleHooks: Array<string>;
}

export default ({
    /**
     * Option merge strategies (used in core/util/options)
     */
    // 合并策略
    optionMergeStrategies: Object.create(null),
  
    /**
     * Whether to suppress warnings.
     */
    // 是否取消Vue 所有的日志与警告
    silent: false,
  
    /**
     * Show production mode tip message on boot?
     */
    // 显示开发模式提示
    productionTip: process.env.NODE_ENV !== 'production',
  
    /**
     * Whether to enable devtools
     */
    // 配置是否允许 vue-devtools 检查代码。开发版本默认为 true，生产版本默认为 false。
    // 生产版本设为 true 可以启用检查。
    devtools: process.env.NODE_ENV !== 'production',
  
    /**
     * Whether to record perf
     */
    // 设置为 true 以在浏览器开发工具中启用对组件初始化、编译、渲染和打补丁的性能追踪。
    // 只适用于开发模式和支持 performance.mark API 的浏览器上。
    performance: false,
  
    /**
     * Error handler for watcher errors
     */
    // 指定组件的渲染和观察期间未捕获错误的处理函数。
    // 这个处理函数被调用时，可获取错误信息和 Vue 实例。
    errorHandler: null,
  
    /**
     * Ignore certain custom elements
     */
    ignoredElements: [],
  
    /**
     * Custom user key aliases for v-on
     */
    // 键位集合
    keyCodes: Object.create(null),
  
    /**
     * Check if a tag is reserved so that it cannot be registered as a
     * component. This is platform-dependent and may be overwritten.
     */
     // 确定是否是保留的标签，如果是，就不能注册为组件，由平台决定，可能被重写
    isReservedTag: no,
  
    /**
     * Check if an attribute is reserved so that it cannot be used as a component
     * prop. This is platform-dependent and may be overwritten.
     */
    // 确定是否是保留的属性，如果是，就不能注册为组件的属性，由平台决定，可能被重写
    isReservedAttr: no,
  
    /**
     * Check if a tag is an unknown element.
     * Platform-dependent.
     */
    // 检查标签是否是一个未知的元素
    isUnknownElement: no,
  
    /**
     * Get the namespace of an element
     */
    // 获取一个元素的命名空间
    getTagNamespace: noop,
  
    /**
     * Parse the real tag name for the specific platform.
     */
    // 给指定的平台解析正真的标签名
    parsePlatformTagName: identity,
  
    /**
     * Check if an attribute must be bound using property, e.g. value
     * Platform-dependent.
     */
    // 检查一个属性是否必须被绑定
    mustUseProp: no,
  
    /**
     * Exposed for legacy reasons
     */
    _lifecycleHooks: LIFECYCLE_HOOKS
  }: Config)