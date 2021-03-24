import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as object from 'yox-common/src/util/object'

import * as field from '../field'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  let { data, ref, props, slots, model, context } = vnode, node: any

  if (vnode.isComponent) {
    node = data[field.COMPONENT]
    // 更新时才要 set
    // 因为初始化时，所有这些都经过构造函数完成了
    if (oldVnode) {

      if (model) {
        if (!props) {
          props = {}
        }
        props[node.$model] = model.value
      }

      if (process.env.NODE_ENV === 'development') {
        if (props) {
          object.each(
            props,
            function (value, key) {
              node.checkProp(key, value)
            }
          )
        }
      }

      const result = object.merge(props, slots)
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
