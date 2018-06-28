/**
 * Prints a warning in the console if it exits
 * 打印一个警告如果存在这个警告
 * 
 * @param {String} message The warning message
 * @return {void}
 */

// 错误警告
export default function warning(message) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(message)
    }

    try {
        /**
         * 抛出此错误是为了方便，
         * 所以如果您在控制台中启用“中断所有异常”，
         * 它将暂停执行此行。
         */
        throw new Error(message)
    } catch (e) { }
}