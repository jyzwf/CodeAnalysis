// 性能表现
import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {    // 开发环境
    const perf = inBrowser && window.performance    // 在浏览器环境下，且支持  window.performance
    /* istanbul ignore if */
    if (
      perf &&
      perf.mark &&
      perf.measure &&
      perf.clearMarks &&
      perf.clearMeasures
    ) {
      mark = tag => perf.mark(tag)
      measure = (name, startTag, endTag) => {
        perf.measure(name, startTag, endTag)
        perf.clearMarks(startTag)
        perf.clearMarks(endTag)
        perf.clearMeasures(name)
      }
    }
  }