/* @flow */

// these helpers produces better vm code in JS engines due to their
// explicitness and function inlining
// 判断是否未定义或为空
export function isUndef(v: any): boolean % checks {
    return v === undefined || v === null
}

// 判断是否定义或不为空
export function isDef(v: any): boolean % checks {
    return v !== undefined && v !== null
}


// 判断是否完全等于布尔值 true
export function isTrue(v: any): boolean % checks {
    return v === true
}


/**
 * Check if value is primitive
 */
// 是否为原始值 
export function isPrimitive(value: any): boolean % checks {
    return typeof value === 'string' || typeof value === 'number'
}


/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
// 是否为对象
export function isObject(obj: mixed): boolean % checks {
    return obj !== null && typeof obj === 'object'
}

const _toString = Object.prototype.toString


/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
// 只有是纯对象才会返回true ,数组等返回 false
export function isPlainObject(obj: any): boolean {
    return _toString.call(obj) === '[object Object]'
}


export function isRegExp(v: any): boolean {
    return _toString.call(v) === '[object RegExp]'
}


/**
 * Convert a value to a string that is actually rendered.
 */
// 将 val 值转为字符串
export function toString(val: any): string {
    return val == null ?
        '' :
        typeof val === 'object' ?
        JSON.stringify(val, null, 2) :
        String(val)
}


/**
 * Convert a input value to a number for persistence.
 * If the conversion fails, return original string.
 */
// 将字符串转换为数字，如果是 NaN 返回原字符串
export function toNumber(val: string): number | string {
    const n = parseFloat(val)
    return isNaN(n) ? val : n
}


/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
// 返回一个函数，来检测某个 key 值是否在这个map 中
/**
 * 
 * @param {string} str 
 * @param {boolean} expectsLowerCase 
 * 
 * eg:
 * makeMap('z,w,f')
 * return : val = > map[val]
 * 
 * map = {z:true,w:true,f:true}
 * 
 * expectsLowerCase = true 时，将要检测的值转换为小写（可选）
 */
export function makeMap(
    str: string,
    expectsLowerCase ? : boolean
): (key: string) => true | void {
    const map = Object.create(null)
    const list: Array < string >= str.split(',')
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true
    }

    return expectsLowerCase ?
        val => map[val.toLowerCase()] :
        val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 */
// 检测一个标签是否是內建的标签
export const isBuiltInTag = makeMap('slot,component', true)



/**
 * Remove an item from an array
 */
// 从数组中移除一个条目，改变原始数组
export function remove(arr: Array < any > , item: any): Array < any > | void {
    if (arr.length) {
        const index = arr.indexOf(item)

        if (index > -1) {
            return arr.splice(index, 1)
        }
    }
}


/**
 * Check whether the object has the property.
 */
// 判断对象是否有特定的属性，不包含继承的属性
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn(obj: Object, key: string): boolean {
    return hasOwnProperty.call(obj, key)
}


/**
 * Create a cached version of a pure function.
 */
// 创建一个纯函数的缓存版本
// cachedFn如果下次传入的额是同一个字符串，那么就不需要再执行 fn 函数，直接取缓存结果
export function cached < F: Function > (fn: F): F {
    const cache = Object.create(null)
    return (function cachedFn(str: string) {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
    }: any)
}


/**
 * Camelize a hyphen-delimited string.
 */
// 将连字符链接的字符串变成驼峰式字符串
// camelize('a00-b11-c22') -> "a00B11C22"
const camelizeRe = /-(\w)/g
export const camelize = cached((str: string): string => {
    return str.replace(camelizeRe, (_, c) => c ? c.toUpperCase() : '')
})


/**
 * Capitalize a string.
 */
// 字符串首字母大写
export const capitalize = cached((str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1)
})


/**
 * Hyphenate a camelCase string.
 */

//  将驼峰转换为连字符的形式
const hyphenateRE = /([^-])([A-Z])/g
export const hyphenate = cached((str: string): string => {
    return str
        .replace(hyphenateRE, '$1-$2')
        .replace(hyphenateRE, '$1-$2') // 这里为什么要两次？ 
        // hyphenate('aaaBbbCccDddDSDS') 如果只有一个replace -> "aaa-bbb-ccc-ddd-ds-ds"
        // hyphenate('aaaBbbCccDddDSDS') 如果2个replace -> "aaa-bbb-ccc-ddd-d-s-d-s"
        .toLowerCase()
})


/**
 * Simple bind, faster than native
 */
export function bind(fn: Function, ctx: Object): Function {
    function boundFn(a) {
        const l: number = arguments.length
        return l ?
            l > 1 ?
            fn.apply(ctx, arguments) :
            fn.call(ctx, a) :
            fn.call(ctx)
    }

    // record original fn length
    // 记录原始函数的 length 属性
    boundFn._length = fn.length
    return boundFn
}


/**
 * Convert an Array-like object to a real Array.
 */
// 将类数组转换为真正的数组
export function toArray(list: any, start ? : number): Array < any > {
    start = start || 0
    let i = list.length - start
    const ret: Array < any > = new Array(i)
    while (i--) {
        ret[i] = list[i + start]
    }
    return ret
}


/**
 * Mix properties into target object.
 */
// 将属性加入到目标对象，会覆盖
export function extend(to: Object, _from: ? Object): Object {
    for (const key in _from) {
        to[key] = _from[key]
    }
    return to
}


/**
 * Merge an Array of Objects into a single Object.
 */
// 合并Array 数组中额每一个对象到一个简单的对象
export function toObject(arr: Array < any > ): Object {
    const res = {}
    for (let i = 0; i < arr.length; i++) {
        if (arr[i]) {
            extend(res, arr[i])
        }
    }
    return res
}


/**
 * Perform no operation.
 */
export function noop() {}

/**
 * Always return false.
 */
export const no = () => false

/**
 * Return same value
 */
export const identity = (_: any) => _

/**
 * Generate a static keys string from compiler modules.
 */
// 产生一个静态的键值字符串，从编译模块中
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export function genStaticKeys(modules: Array < ModuleOptions > ): string {
    return modules.reduce((keys, m) => {
        return keys.concat(m.staticKeys || [])
    }, []).join(',')
}
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
// 判断两个值是否相等，并不是严格相等
export function looseEqual(a: mixed, b: mixed): boolean {
    const isObjectA = isObject(a)
    const isObjectB = isObject(b)
    if (isObjectA && isObjectB) { // a,b 都是对象
        try {
            return JSON.stringify(a) === JSON.stringify(b)
        } catch (e) {
            // possible circular reference
            return a === b
        }
    } else if (!isObjectA && !isObjectB) { // a,b 都不是对象
        return String(a) === String(b)
    } else {
        return false
    }
}


// 数组中是否包含与 val 相等的值，有则返回索引
export function looseIndexOf(arr: Array < mixed > , val: mixed): number {
    for (let i = 0; i < arr.length; i++) {
        if (looseEqual(arr[i], val)) return i
    }
    return -1
}


/**
 * Ensure a function is called only once.
 */
// 确保函数只被调用一次
export function once (fn: Function): Function {
    let called = false
    return function () {
      if (!called) {
        called = true
        fn.apply(this, arguments)
      }
    }
  }