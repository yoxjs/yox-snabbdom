import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { node, nativeProps } = vnode,

  oldNativeProps = oldVNode && oldVNode.nativeProps

  if (nativeProps !== oldNativeProps) {

    if (nativeProps) {
      const oldValue = oldNativeProps || constant.EMPTY_OBJECT
      for (let name in nativeProps) {
        if (oldValue[name] === constant.UNDEFINED
          || nativeProps[name] !== oldValue[name]
        ) {
          api.setProp(node as HTMLElement, name, nativeProps[name])
        }
      }
    }

    if (oldNativeProps) {
      const newValue = nativeProps || constant.EMPTY_OBJECT
      for (let name in oldNativeProps) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeProp(node as HTMLElement, name)
        }
      }
    }

  }

}