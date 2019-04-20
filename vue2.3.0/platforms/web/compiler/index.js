/* @flow */

import { isUnaryTag, canBeLeftOpenTag } from './util'
import { genStaticKeys } from 'shared/util'
import { createCompiler } from 'compiler/index'

import modules from './modules/index'
import directives from './directives/index'

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,  // 包括klass和style，对模板中类和样式的解析
  directives, // 这里包括model（v-model）、html（v-html）、text(v-text)三个指令
  isPreTag, // 是否是pre标签
  isUnaryTag, // 是否是单标签，比如img、input、iframe等
  mustUseProp, // 需要使用props绑定的属性，比如value、selected等
  canBeLeftOpenTag, // 可以不闭合的标签，比如tr、td等
  isReservedTag, // 是否是保留标签，html标签和SVG标签
  getTagNamespace, // 获取命名空间，svg和math
  staticKeys: genStaticKeys(modules) // 静态关键词，包括staticClass,staticStyle
}

/*这里会根据不同平台传递不同的baseOptions创建编译器*/
const { compile, compileToFunctions } = createCompiler(baseOptions)
export { compile, compileToFunctions }