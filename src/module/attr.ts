import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import Element from '../vnode/Element'
import Attribute from '../vnode/Attribute'

export function create(api: any, vnode: Element) {

  let { el, attrs } = vnode

  if (attrs) {
    object.each(
      attrs,
      function (attr: Attribute, name: string) {
        api.setAttr(el, name, attr.value, attr.namespace)
      }
    )
  }

}

export function update(api: any, vnode: Element, oldVnode: Element) {

  let { el, attrs } = vnode, oldAttrs = oldVnode.attrs

  if (attrs || oldAttrs) {

    attrs = attrs || env.EMPTY_OBJECT
    oldAttrs = oldAttrs || env.EMPTY_OBJECT

    object.each(
      attrs,
      function (attr: Attribute, name: string) {
        if (!oldAttrs[name]
          || attr.value !== oldAttrs[name].value
          || attr.namespace !== oldAttrs[name].namespace
        ) {
          api.setAttr(el, name, attr.value, attr.namespace)
        }
      }
    )

    object.each(
      oldAttrs,
      function (attr: Attribute, name: string) {
        if (!attrs[name]) {
          api.removeAttr(el, name, attr.namespace)
        }
      }
    )

  }

}
