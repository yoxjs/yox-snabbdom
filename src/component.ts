import VNode from '../../yox-type/src/vnode/VNode'

import isDef from '../../yox-common/src/function/isDef'
import * as env from '../../yox-common/src/util/env'
import * as object from '../../yox-common/src/util/object'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { data, ref, props, slots, model, context } = vnode, node: any

  if (vnode.isComponent) {
    node = data[field.COMPONENT]
    // 更新时才要 set
    // 因为初始化时，所有这些都经过构造函数完成了
    if (oldVnode) {

      // 更新组件时，如果写了 <Component model="xx"/>
      // 必须把双向绑定的值写到 props 里，否则一旦 propTypes 加了默认值
      // 传下去的数据就错了
      if (isDef(model)) {
        if (!props) {
          props = {}
        }
        props[node.$model] = model
      }

      const result = object.merge(props ? node.checkPropTypes(props) : env.UNDEFINED, slots)
      if (result) {
        node.forceUpdate(result)
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
