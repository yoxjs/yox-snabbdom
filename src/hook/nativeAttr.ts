import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function afterCreate(api: DomApi, vnode: VNode) {

  const { nativeAttrs } = vnode
  if (nativeAttrs) {

    const element = vnode.node as HTMLElement

    for (let name in nativeAttrs) {
      api.setAttr(element, name, nativeAttrs[name])
    }

  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newNativeAttrs = vnode.nativeAttrs, oldNativeAttrs = oldVNode.nativeAttrs
  if (newNativeAttrs !== oldNativeAttrs) {

    const element = vnode.node as HTMLElement

    if (newNativeAttrs) {
      const oldValue = oldNativeAttrs || constant.EMPTY_OBJECT
      for (let name in newNativeAttrs) {
        if (oldValue[name] === constant.UNDEFINED
          || newNativeAttrs[name] !== oldValue[name]
        ) {
          api.setAttr(element, name, newNativeAttrs[name])
        }
      }
    }

    if (oldNativeAttrs) {
      const newValue = newNativeAttrs || constant.EMPTY_OBJECT
      for (let name in oldNativeAttrs) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeAttr(element, name)
        }
      }
    }

  }

}
