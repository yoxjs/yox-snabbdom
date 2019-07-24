import {
  VNode,
} from 'yox-type/src/vnode'

import * as constant from 'yox-common/src/util/constant'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeProps } = vnode,

  oldNativeProps = oldVnode && oldVnode.nativeProps

  if (nativeProps || oldNativeProps) {

    const newValue = nativeProps || constant.EMPTY_OBJECT,

    oldValue = oldNativeProps || constant.EMPTY_OBJECT

    for (let name in newValue) {
      if (oldValue[name] === constant.UNDEFINED
        || newValue[name] !== oldValue[name]
      ) {
        api.prop(node, name, newValue[name])
      }
    }

    for (let name in oldValue) {
      if (newValue[name] === constant.UNDEFINED) {
        api.removeProp(node, name)
      }
    }

  }

}