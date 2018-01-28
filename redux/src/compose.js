/**
 * 组合函数
 * @param {...Function} funcs The function to compose
 * @return {Function} A function obtained by composing the argument
 * function from right to left,For example , compose(f,g,h) is identical to doing
 * (...args)=>f(g(h(...args)))
 * const compose = (f, g) => {
 *      return (x)=>{
 *          return f(g(x))     
 *      }
 * }
 */


 /**
  * reduce 为数组中的每一个元素依次执行回调函数，不包括数组中被删除或从未被赋值的元素，接受四个参数：
  * - accumulator 初始值（或者上一次回调函数的返回值）
  * - currentValue 当前元素值
  * - currentIndex 当前索引
  * - array 调用 reduce 的数组。
  * 回调函数第一次执行时，accumulator 和 currentValue 的取值有两种情况：
  * - 调用 reduce 时提供initialValue，accumulator 取值为 initialValue ，currentValue 取数组中的第一个值；
  * - 没有提供 initialValue ，accumulator 取数组中的第一个值，currentValue 取数组中的第二个值。

  * 注意: 不提供 initialValue ，reduce 会从索引1的地方开始执行 callback 方法，跳过第一个索引。提供 initialValue ，从索引0开始
  */

export default function compose(...funcs) { 
    if (funcs.length === 0) {
        return arg => arg
    }

    if (funcs.length === 1) {
        return funcs[0]
    }

    return funcs.reduce((a, b) => (...args) => a(b(...args)))
}