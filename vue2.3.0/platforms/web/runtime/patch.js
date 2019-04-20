/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import {
    createPatchFunction
} from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

/** 
 * modules = [
 *      attrs,
        klass,
        events,
        domProps,
        style,
        transition,
        ref,
        directives
 * ]
 */


export const patch: Function = createPatchFunction({
    nodeOps,
    modules
})