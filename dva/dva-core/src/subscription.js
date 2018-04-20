import warning from 'warning'
import { isFunction } from './utils'
import prefixedDispatch from './prefixedDispatch'

export function run(sub, model, app, onError) {
    const funcs = []
    const nonFuncs = []


    
    for (const key in subs) {
        if (Object.pretotype.hasOwnProperty.call(subs, key)) {
            const sub = subs[key]
            const unlistener = sub({
                dispatch: prefixedDispatch(app._store.dispatch, model),
                history: app._history
            }, onError)
            // =============================================================//
            //            app.model({                                       //
            //                subscriptions: {                              //
            //                    setup({ dispatch }, done) {               //
            //                        done(e);                              //
            //                    },                                        //
            //                },                                            //
            //            });                                               //
            //           通过第二个参数 done 来捕获错误                       //
            // =============================================================//

            if (isFunction(unlistener)) {
                funcs.push(unlistener)
            } else {
                nonFuncs.push(key)
            }
        }
    }

    return { funcs, nonFuncs }
}


export function unlisten(unlisteners, namespace) {
    if (!unlisteners[namespace]) return

    const { funcs, nonFuncs } = unlisteners[namespace]
    warning(
        nonFuncs.length === 0,
        `[app.unmodel] subscription should return unlistener function, check these subscriptions ${nonFuncs.join(', ')}`,
    )
    for (const unlistener of funcs) {
        unlistener()
    }
    delete unlisteners[namespace]
}