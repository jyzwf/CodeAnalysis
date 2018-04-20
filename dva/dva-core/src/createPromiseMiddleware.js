import { NAMESPACE_SEP } from './constants'

export default function createPromiseMiddleware(app) {
    return () => next => action => {
        const { type } = action

        if (isEffect(type)) {
            return new Promise((resolve, reject) => {
                next({
                    __dva_resolve: resolve,
                    __dva_reject: reject,
                    ...action
                })
            })
        } else {
            return next(action)
        }
    }


    // effects 可以为空，PlainObject
    function isEffect(type) {
        if (!type || typeof type !== 'string') return false
        // const newKey = `${namespace}${NAMESPACE_SEP}${key}`;     -> ./prefixNamespace.js
        const [namespace] = type.split(NAMESPACE_SEP)
        const model = app._models.filter(m => m.namespace === namespace)[0] //找到第一个 model,

        if (model) {
            if (model.effects && model.effects[type]) {
                return true
            }
        }

        return false
    }

}