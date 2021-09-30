import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as object from 'yox-common/src/util/object'

export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { component, props, slots } = vnode

  // 更新时才要 set
  // 因为初始化时，所有这些都经过构造函数完成了
  if (component && oldVNode) {
    if (process.env.NODE_ENV === 'development') {
      if (props) {
        for (let key in props) {
          component.checkProp(key, props[key])
        }
      }
    }

    const result = object.merge(props, slots)
    if (result) {
      component.forceUpdate(result)
    }
  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { component } = vnode
  if (component) {
    component.destroy()
  }
}