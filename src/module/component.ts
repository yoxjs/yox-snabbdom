import VNode from 'yox-template-compiler/src/vnode/VNode'

import * as field from '../field'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { data, ref, props, slots, instance } = vnode, node: any

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
    node = data[field.NODE]
  }

  if (ref) {
    instance.$refs[ref] = node
  }

}
