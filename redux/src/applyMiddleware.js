import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks,such as expressing
 * asynchronous actions in a concise manner,or longging every action payload.
 * 创建一个 store 增强器，将中间件应用于 store里面的 dispatch 方法。这对于各种任务例如：以简洁的方式来表达异步操作或者记录每个 action 
 * 的 payload 是十分便利的
 * 
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 * 由于中间件可能是异步的，所以这个应该在组合链中第一个 store 增强器
 * 
 * 
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */


export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    // 获取原始的 store，不过这里的enhancer，在createStore里面不会传入，
    // return enhancer(createStore)(reducer, preloadedState)
    // 所以如果preloadedState是函数的时候，才会变成 enhancer
    // 所以这里可以有一连串的加强 enhancer
    const store = createStore(...args)
    // 获取dispatch 的原始引用
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
        `Other middleware would not be applied to this dispatch.`
      )
    }

    // 可以供中间件使用的 store 里的几个变量
    const middlewareAPI = {
      getState: store.getState,
      // 这里为什么是dispatch 而不是 store.dispatch呢？
      // 这是因为现在的 dispatch 是store.dispatch 的引用，而后面他会被中间件改造，变成新的 dispatch ,否则只能是store.dispatch
      dispatch: (...args) => dispatch(...args)
    }

    // 注册中间件调用链
    const chain = middlewares.map(middleware => middleware(middlewareAPI)) // 调用中间件并返回结果

    // 传入dispatch供各个中间件使用，这里会有一连串的函数组合，最后一个函数先执行，然后依次项前一项执行，所以要考虑中间件的顺序 返回加强后的dispatch
    dispatch = compose(...chain)(store.dispatch)

    //返回经middlewares增强后的createStore
    return {
      ...store,
      dispatch
    }
  }
}


/* 
  对dispatch调用的action(例如，dispatch(addNewTodo(todo)))进行检查，如果action在第一次调用之后返回的是function，
  则将(dispatch, getState)作为参数注入到action返回的方法中，否则就正常对action进行分发，
  因此，当action内部需要获取state，或者需要进行异步操作，在操作完成之后进行事件调用分发的话，
  我们就可以让action 返回一个以(dispatch, getState)为参数的function而不是通常的Object，enhance就会对其进行检测以便正确的处理
*/

/*
function createThunkMiddleware(extraArgument) {
  return ({ dispatch, getState }) => next => action => {
    if (typeof action === 'function') {
      return action(dispatch, getState, extraArgument);
    }

    return next(action);
  };
}

const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

export default thunk;



const logger = store => next => action => {
  console.log('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  return result
}


const crashReporter = store => next => action => {
  try {
    return next(action)
  } catch (err) {
    console.error('Caught an exception!', err)
    Raven.captureException(err, {
      extra: {
        action,
        state: store.getState()
      }
    })
    throw err
  }
}
*/