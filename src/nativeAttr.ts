import * as env from 'yox-common/src/util/env'
import * as object from 'yox-common/src/util/object'

import VNode from 'yox-type/src/vnode/VNode'
import Attribute from 'yox-type/src/vnode/Attribute'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  let { node, nativeAttrs } = vnode, oldNativeAttrs = oldVnode && oldVnode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    nativeAttrs = nativeAttrs || env.EMPTY_OBJECT
    oldNativeAttrs = oldNativeAttrs || env.EMPTY_OBJECT

    object.each(
      nativeAttrs,
      function (attr: Attribute, name: string) {
        if (!oldNativeAttrs[name]
          || attr.value !== oldNativeAttrs[name].value
        ) {
          api.attr(node, name, attr.value)
        }
      }
    )

    object.each(
      oldNativeAttrs,
      function (_: Attribute, name: string) {
        if (!nativeAttrs[name]) {
          api.removeAttr(node, name)
        }
      }
    )

  }

}
