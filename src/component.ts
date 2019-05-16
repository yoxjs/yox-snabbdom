import VNode from '../../yox-type/src/vnode/VNode'
import * as env from '../../yox-common/src/util/env'
import * as object from '../../yox-common/src/util/object'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { data, ref, props, slots, context } = vnode, node: any

  if (vnode.isComponent) {
    node = data[field.COMPONENT]
    // 更新时才要 set
    // 因为初始化时，所有这些都经过构造函数完成了
    if (oldVnode) {
      const result = object.merge(props ? node.checkPropTypes(props) : env.UNDEFINED, slots)
      if (result) {
        node.set(result)
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
