import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'
import Attribute from 'yox-template-compiler/src/vnode/Attribute'

export function create(api: any, vnode: VNode) {

  const { el, nativeAttrs } = vnode

  if (nativeAttrs) {
    object.each(
      nativeAttrs,
      function (attr: Attribute, name: string) {
        api.setAttr(el, name, attr.value, attr.namespace)
      }
    )
  }

}

export function update(api: any, vnode: VNode, oldVnode: VNode) {

  let { el, nativeAttrs } = vnode, oldNativeAttrs = oldVnode.nativeAttrs

  if (nativeAttrs || oldNativeAttrs) {

    nativeAttrs = nativeAttrs || env.EMPTY_OBJECT
    oldNativeAttrs = oldNativeAttrs || env.EMPTY_OBJECT

    object.each(
      nativeAttrs,
      function (attr: Attribute, name: string) {
        if (!oldNativeAttrs[name]
          || attr.value !== oldNativeAttrs[name].value
          || attr.namespace !== oldNativeAttrs[name].namespace
        ) {
          api.setAttr(el, name, attr.value, attr.namespace)
        }
      }
    )

    object.each(
      oldNativeAttrs,
      function (attr: Attribute, name: string) {
        if (!nativeAttrs[name]) {
          api.removeAttr(el, name, attr.namespace)
        }
      }
    )

  }

}
