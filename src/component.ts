import VNode from 'yox-type/src/vnode/VNode'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { data, ref, props, slots, context } = vnode, node: any

  if (vnode.isComponent) {
    node = data[field.COMPONENT]
    // 更新时才要 set
    // 因为初始化时，所有这些都经过构造函数完成了
    if (oldVnode) {
      if (props) {
        node.set(node.checkPropTypes(props))
      }
      if (slots) {
        node.set(slots)
      }
    }
  }
  else {
    node = vnode.node
  }

  if (ref) {
    const refs = context.$refs
    if (refs) {
      refs[ref] = node
    }
  }

}
