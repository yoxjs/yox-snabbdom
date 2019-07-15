import {
  VNode,
  Attribute,
} from 'yox-type/src/vnode'

import * as constant from 'yox-type/src/constant'
import * as object from 'yox-common/src/util/object'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeAttrs } = vnode,

  oldNativeAttrs = oldVnode && oldVnode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    const newValue = nativeAttrs || constant.EMPTY_OBJECT,

    oldValue = oldNativeAttrs || constant.EMPTY_OBJECT

    object.each(
      newValue,
      function (attr: Attribute, name: string) {
        if (!oldValue[name]
          || attr.value !== oldValue[name].value
        ) {
          api.attr(node, name, attr.value)
        }
      }
    )

    object.each(
      oldValue,
      function (_: Attribute, name: string) {
        if (!newValue[name]) {
          api.removeAttr(node, name)
        }
      }
    )

  }

}
