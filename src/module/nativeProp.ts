import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeProps } = vnode,

  oldNativeProps = oldVnode && oldVnode.nativeProps

  if (nativeProps || oldNativeProps) {

    const newValue = nativeProps || constant.EMPTY_OBJECT,

    oldValue = oldNativeProps || constant.EMPTY_OBJECT

    if (nativeProps) {
      for (let name in nativeProps) {
        if (oldValue[name] === constant.UNDEFINED
          || nativeProps[name] !== oldValue[name]
        ) {
          api.setProp(node as HTMLElement, name, nativeProps[name])
        }
      }
    }

    if (oldNativeProps) {
      for (let name in oldNativeProps) {
        if (newValue[name] === constant.UNDEFINED) {
          api.removeProp(node as HTMLElement, name)
        }
      }
    }

  }

}