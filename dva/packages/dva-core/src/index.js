import { combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga/lib/internal/middleware';
import invariant from 'invariant';
import checkModel from './checkModel';
import prefixNamespace from './prefixNamespace';
import Plugin, { filterHooks } from './Plugin';
import createStore from './createStore';
import getSaga from './getSaga';
import getReducer from './getReducer';
import createPromiseMiddleware from './createPromiseMiddleware';
import {
  run as runSubscription,
  unlisten as unlistenSubscription,
} from './subscription';
import { noop } from './utils';

// Internal model to update global state when do unmodel
const dvaModel = {
  namespace: '@@dva',
  state: 0,
  reducers: {
    UPDATE(state) {
      return state + 1;
    },
  },
};

/**
 * Create dva-core instance.
 *
 * @param hooksAndOpts
 * @param createOpts
 */
export function create(hooksAndOpts = {}, createOpts = {}) {
  const { initialReducer, setupApp = noop } = createOpts;

  const plugin = new Plugin();
  plugin.use(filterHooks(hooksAndOpts));

  const app = {
    _models: [prefixNamespace({ ...dvaModel })],
    _store: null,
    _plugin: plugin,
    use: plugin.use.bind(plugin),
    model,
    start,
  };
  return app;

  /**
   * Register model before app is started.
   *
   * @param m {Object} model to register
   */
  function model(m) {
    if (process.env.NODE_ENV !== 'production') {
      // 检查 namespace,reducers,effects,subscription
      checkModel(m, app._models);
    }

    // 给每个 model 的 reducers,effects 添加 namespace
    const prefixedModel = prefixNamespace({ ...m });
    // 保存现有的model,为以后的model做检测（防止 namespace)
    app._models.push(prefixedModel);
    return prefixedModel;
  }

  /**
   * Inject model after app is started.
   *
   * @param createReducer
   * @param onError
   * @param unlisteners
   * @param m
   */
  // 动态注入model，并且执行 subscriptions
  function injectModel(createReducer, onError, unlisteners, m) {
    m = model(m);

    const store = app._store;
    store.asyncReducers[m.namespace] = getReducer(
      m.reducers,
      m.state,
      plugin._handleActions
    );
    store.replaceReducer(createReducer(store.asyncReducers));
    if (m.effects) {
      store.runSaga(
        app._getSaga(m.effects, m, onError, plugin.get('onEffect'))
      );
    }
    if (m.subscriptions) {
      unlisteners[m.namespace] = runSubscription(
        m.subscriptions,
        m,
        app,
        onError
      );
    }
  }

  /**
   * Unregister model.
   *
   * @param createReducer
   * @param reducers
   * @param unlisteners
   * @param namespace
   *
   * Unexpected key warn problem:
   * https://github.com/reactjs/redux/issues/1636
   */
  function unmodel(createReducer, reducers, unlisteners, namespace) {
    const store = app._store;

    // Delete reducers
    delete store.asyncReducers[namespace];
    delete reducers[namespace];
    store.replaceReducer(createReducer());
    store.dispatch({ type: '@@dva/UPDATE' });

    // Cancel effects
    store.dispatch({ type: `${namespace}/@@CANCEL_EFFECTS` });

    // Unlisten subscrioptions
    unlistenSubscription(unlisteners, namespace);

    // Delete model from app._models
    app._models = app._models.filter(model => model.namespace !== namespace);
  }

  /**
   * Start the app.
   *
   * @returns void
   */
  function start() {
    // Global error handler
    const onError = (err, extension) => {
      if (err) {
        if (typeof err === 'string') err = new Error(err);
        err.preventDefault = () => {
          err._dontReject = true;
        };
        plugin.apply('onError', err => {
          throw new Error(err.stack || err);
        })(err, app._store.dispatch, extension);
      }
    };


    // 动态调用
    // https://redux-saga-in-chinese.js.org/docs/api/
    const sagaMiddleware = createSagaMiddleware();
    const promiseMiddleware = createPromiseMiddleware(app);
    app._getSaga = getSaga.bind(null);

    const sagas = [];
    // initialReducer: {routing},
    const reducers = { ...initialReducer };
    for (const m of app._models) {

      // 以该 model为例
      // {
      //   namespace: 'products',
      //   state: [],
      //   reducers: {
      //       'delete'(state, { payload: id }) {
      //           return state.filter(item => item.id !== id)
      //       },
      //      'add'(){}
      //   }
      // }

      // reducers.products =  (state = defaultState, action) => reducer(state, action)
      // 每一个model里的reduce是对应到最终的reducer的一个
      reducers[m.namespace] = getReducer(
        m.reducers,   // 已经在 prefixNamespace 中加了前缀
        m.state,
        plugin._handleActions
      );
      if (m.effects)
        sagas.push(app._getSaga(m.effects, m, onError, plugin.get('onEffect')));
    }

    // reducerEnhancer = function (reducer) {
    //   for (const reducerEnhancer of hook) {
    //     reducer = reducerEnhancer(reducer);
    //   }
    //   return reducer;
    // }

    const reducerEnhancer = plugin.get('onReducer');
    const extraReducers = plugin.get('extraReducers');
    invariant(
      Object.keys(extraReducers).every(key => !(key in reducers)),
      `[app.start] extraReducers is conflict with other reducers, reducers list: ${Object.keys(
        reducers
      ).join(', ')}`
    );

    // Create store
    const store = (app._store = createStore({
      // eslint-disable-line
      reducers: createReducer(),
      initialState: hooksAndOpts.initialState || {},
      plugin,
      createOpts,
      sagaMiddleware,
      promiseMiddleware,
    }));

    // Extend store
    store.runSaga = sagaMiddleware.run;
    store.asyncReducers = {};

    // Execute listeners when state is changed
    const listeners = plugin.get('onStateChange');
    for (const listener of listeners) {
      store.subscribe(() => {
        listener(store.getState());
      });
    }

    // Run sagas
    sagas.forEach(sagaMiddleware.run);

    // Setup app
    setupApp(app);

    // Run subscriptions
    const unlisteners = {};
    for (const model of this._models) {
      if (model.subscriptions) {
        unlisteners[model.namespace] = runSubscription(
          model.subscriptions,
          model,
          app,
          onError
        );
      }
    }

    // Setup app.model and app.unmodel
    // partial args
    app.model = injectModel.bind(app, createReducer, onError, unlisteners);
    app.unmodel = unmodel.bind(app, createReducer, reducers, unlisteners);

    /**
     * Create global reducer for redux.
     *
     * @returns {Object}
     */
    function createReducer() {
      return reducerEnhancer(
        combineReducers({
          ...reducers,
          ...extraReducers,
          ...(app._store ? app._store.asyncReducers : {}),
        })
      );
    }
  }
}
