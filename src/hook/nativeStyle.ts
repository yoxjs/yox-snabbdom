import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function afterCreate(api: DomApi, vnode: VNode) {

  const { nativeStyles } = vnode
  if (nativeStyles) {

    const elementStyle = (vnode.node as HTMLElement).style

    for (let name in nativeStyles) {
      api.setStyle(elementStyle, name, nativeStyles[name])
    }

  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newNativeStyles = vnode.nativeStyles, oldNativeStyles = oldVNode.nativeStyles
  if (newNativeStyles !== oldNativeStyles) {

    const elementStyle = (vnode.node as HTMLElement).style

    if (newNativeStyles) {
      const oldValue = oldNativeStyles || constant.EMPTY_OBJECT
      for (let name in newNativeStyles) {
        if (oldValue[name] === constant.UNDEFINED
          || newNativeStyles[name] !== oldValue[name]
        ) {
          api.setStyle(elementStyle, name, newNativeStyles[name])
        }
      }
    }

    if (oldNativeStyles) {
      const newValue = newNativeStyles || constant.EMPTY_OBJECT
      for (let name in oldNativeStyles) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeStyle(elementStyle, name)
        }
      }
    }

  }

}