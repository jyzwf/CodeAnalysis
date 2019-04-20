const data = `{key:${el.key},ref:${el.ref},refInFor:true,pre:true,tag:"${
  el.tag
}",staticClass:${el.staticClass},class:${el.classBinding},staticStyle:${
  el.staticStyle
},style:(${el.styleBinding}),attrs:{${genProps(el.attrs)}},domProps:{${genProps(
  el.props
  },expression:${el.model.expression}},`;
  )}},on:{},nativeOn:{},slot:${el.slotTarget},scopedSlots:_u([...])},`;
