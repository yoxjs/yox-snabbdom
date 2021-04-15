import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { node, nativeAttrs } = vnode,

  oldNativeAttrs = oldVNode && oldVNode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    if (nativeAttrs) {
      const oldValue = oldNativeAttrs || constant.EMPTY_OBJECT
      for (let name in nativeAttrs) {
        if (oldValue[name] === constant.UNDEFINED
          || nativeAttrs[name] !== oldValue[name]
        ) {
          api.setAttr(node as HTMLElement, name, nativeAttrs[name])
        }
      }
    }

    if (oldNativeAttrs) {
      const newValue = nativeAttrs || constant.EMPTY_OBJECT
      for (let name in oldNativeAttrs) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeAttr(node as HTMLElement, name)
        }
      }
    }

  }

}
