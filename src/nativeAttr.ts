import {
  VNode,
} from 'yox-type/src/vnode'

import * as constant from 'yox-common/src/util/constant'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeAttrs } = vnode,

  oldNativeAttrs = oldVnode && oldVnode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    const newValue = nativeAttrs || constant.EMPTY_OBJECT,

    oldValue = oldNativeAttrs || constant.EMPTY_OBJECT

    for (let name in newValue) {
      if (oldValue[name] === constant.UNDEFINED
        || newValue[name] !== oldValue[name]
      ) {
        api.attr(node, name, newValue[name])
      }
    }

    for (let name in oldValue) {
      if (newValue[name] === constant.UNDEFINED) {
        api.removeAttr(node, name)
      }
    }

  }

}
