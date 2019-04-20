/* @flow */

// 冻结一个空对象
export const emptyObject = Object.freeze({})

/**
 * Check if a string starts with $ or _
 */
// 检查一个字符串是否以 $ 或者 _ 开头
export function isReserved(str: string): boolean {
    const c = (str + '').charCodeAt(0)
    //  0x24 -> $ , 0x5F -> _
    return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
// 定义一个属性
export function def(obj: Object, key: string, val: any, enumerable ? : boolean) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
}

/**
 * Parse simple path.
 */
// 解析简单路径
const bailRE = /[^\w.$]/
export function parsePath(path: string): any {
    if (bailRE.test(path)) {
        return
    }
    const segments = path.split('.')
    return function (obj) {
        for (let i = 0; i < segments.length; i++) {
            // 这里一步步获取值，也就执行了属性的get方法，绑定了当前的watcher
            if (!obj) return
            obj = obj[segments[i]]
        }
        return obj
    }
}