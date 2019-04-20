/* @flow */

import {
  cached
} from 'shared/util'
import {
  parseFilters
} from './filter-parser'

// 默认的模板分隔符匹配
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g
// 匹配需要转义的字符
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

// text = '正在学习{{Vue}} Vue很棒'

export function parseText(
  text: string,
  delimiters ? : [string, string] // ["{{","}}"]
): string | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE  // /\{\{((?:.|\n)+?)\}\}/g
  if (!tagRE.test(text)) { // 普通文本
    return
  }
  const tokens = []
  let lastIndex = tagRE.lastIndex = 0
  let match, index
  while ((match = tagRE.exec(text))) { //第二次，match =null
    index = match.index
    // push text token
    // 第一次循环：
    // index = 4,tokens = ['正在学习']
    if (index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, index)))
    }


    // tag token
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)

    // lastIndex = 11
    lastIndex = index + match[0].length
  }
  // tokens = ['正在学习',`_s(${exp})`,' Vue很棒']
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)))
  }
  // return '正在学习'+`_s(${exp})`+' Vue很棒'
  return tokens.join('+')
}