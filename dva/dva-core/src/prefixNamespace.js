import warning from 'warning'
import { isArray } from './utils'
import { NAMESPACE_SEP } from './constants'

function prefix(obj, namespace, type) {
    return Object.keys(obj).reduce((memo, key) => {
        // reducers/effects 不能以 `${namespace}/`开头
        // ================================================================================//
        //                                                                                 //
        //      如果这样开头会怎样？？？？？？？？？？？？？？？？？？？？？？？？？？？         //
        //                                                                                //
        // ===============================================================================//
        warning(
            key.indexOf(`${namespace}${NAMESPACE_SEP}`) !== 0,
            `[prefixNamespace]: ${type} ${key} should not be prefixed with namespace ${namespace}`,
        )

        const newKey = `${namespace}${NAMESPACE_SEP}${key}`;
        memo[newKey] = obj[key]
        return memo
    }, {})
}

export default function prefixNamespace(model) {
    const {
        namespace,
        reducers,
        effects
    } = model

    if (reducers) {
        if (isArray(reducers)) {
            model.reducers = prefix(reducers, namespace, 'reducer')
        }
    }

    if (effects) {
        model.effects = prefix(effects, namespace, 'effect')
    }

    return model
}