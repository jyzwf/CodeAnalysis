/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */

// 是否是纯对象，可以参考lodash 
// 之前这个文件是没有的，具体出现原因可以参考如下：
// https://github.com/reactjs/redux/pull/2599
// 主要是如果 actions 数量过于庞大，出于性能以及运算速度考虑
export default function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false

    let proto = obj
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto)
    }

    return Object.getPrototypeOf(obj) === proto
}