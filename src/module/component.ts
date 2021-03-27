import {
  YoxInterface,
} from 'yox-type/src/yox'

import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as object from 'yox-common/src/util/object'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  let { component, node, ref, props, slots, model, context } = vnode

  // 更新时才要 set
  // 因为初始化时，所有这些都经过构造函数完成了
  if (component && oldVnode) {
    if (model) {
      if (!props) {
        props = {}
      }
      props[component.$model as string] = model.value
    }

    if (process.env.NODE_ENV === 'development') {
      if (props) {
        object.each(
          props,
          function (value, key) {
            (component as YoxInterface).checkProp(key, value)
          }
        )
      }
    }

    const result = object.merge(props, slots)
    if (result) {
      component.forceUpdate(result)
    }
  }

  if (ref) {
    const refs = context.$refs
    if (refs) {
      refs[ref] = component || node as HTMLElement
    }
  }

}
