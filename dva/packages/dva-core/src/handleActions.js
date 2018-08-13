import invariant from 'invariant';

function identify(value) {
  return value;
}

function handleAction(actionType, reducer = identify) {
  // 接入redux
  return (state, action) => {
    const { type } = action;
    invariant(type, 'dispatch: action should be a plain Object with type');
    if (actionType === type) {
      return reducer(state, action);
    }
    return state;
  };
}


// 有趣
// 这里为何不搞键值对，而要遍历???
function reduceReducers(...reducers) {
  // 循环遍历reducer 直到匹配为止
  return (previous, current) =>
    reducers.reduce((p, r) => r(p, current), previous);
}

function handleActions(handlers, defaultState) {
  // 获取所有的 renders
  const reducers = Object.keys(handlers).map(type =>
    handleAction(type, handlers[type])
  );

  // reducers = [

  //   (state, action) => {

  //     const { type } = action;
  //     invariant(type, 'dispatch: action should be a plain Object with type');
  //     if (actionType === type) {  // actionType = 'products/delete'
  //       return reducer(state, action);
  //     }
  //     return state;
  //   },

  //   (state, action) => {
  //     const { type } = action;
  //     invariant(type, 'dispatch: action should be a plain Object with type');
  //     if (actionType === type) {// actionType = 'products/add'
  //       return reducer(state, action);
  //     }
  //     return state;
  //   }

  // ]



  //reducer = (previous, current) => reducers.reduce((p, r) => r(p, current), previous);
  const reducer = reduceReducers(...reducers);

  return (state = defaultState, action) => reducer(state, action);
}

export default handleActions;
