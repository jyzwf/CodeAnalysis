import config from '../config'
import { warn } from './debug'
import { inBrowser } from './env'

export function handleError (err, vm, info) {
  if (config.errorHandler) { // 配置中 errorHandler 存在
    config.errorHandler.call(null, err, vm, info)
  } else {
    if (process.env.NODE_ENV !== 'production') {    // 不是生产环境
      warn(`Error in ${info}: "${err.toString()}"`, vm)
    }
    /* istanbul ignore else */
    if (inBrowser && typeof console !== 'undefined') {  // 浏览器环境下，使用 console.log 抛出错误
      console.error(err)
    } else {
      throw err
    }
  }
}