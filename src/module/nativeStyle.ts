import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { node, nativeStyles } = vnode,

  oldNativeStyles = oldVNode && oldVNode.nativeStyles

  if (nativeStyles !== oldNativeStyles) {

    const nodeStyle = (node as HTMLElement).style

    if (nativeStyles) {
      const oldValue = oldNativeStyles || constant.EMPTY_OBJECT
      for (let name in nativeStyles) {
        if (oldValue[name] === constant.UNDEFINED
          || nativeStyles[name] !== oldValue[name]
        ) {
          api.setStyle(nodeStyle, name, nativeStyles[name])
        }
      }
    }

    if (oldNativeStyles) {
      const newValue = nativeStyles || constant.EMPTY_OBJECT
      for (let name in oldNativeStyles) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeStyle(nodeStyle, name)
        }
      }
    }

  }

}