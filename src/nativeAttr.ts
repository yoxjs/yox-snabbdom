import * as env from '../../yox-common/src/util/env'
import * as object from '../../yox-common/src/util/object'

import VNode from '../../yox-type/src/vnode/VNode'
import Attribute from '../../yox-type/src/vnode/Attribute'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeAttrs } = vnode,

  oldNativeAttrs = oldVnode && oldVnode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    const newValue = nativeAttrs || env.EMPTY_OBJECT,

    oldValue = oldNativeAttrs || env.EMPTY_OBJECT

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
