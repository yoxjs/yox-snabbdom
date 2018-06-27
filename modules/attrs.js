
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

function createAttrs(vnode) {

  let { el, attrs } = vnode, api = this
  if (!vnode[ env.RAW_COMPONENT ] && attrs) {
    object.each(
      attrs,
      function (value, name) {
        api.setAttr(el, name, value)
      }
    )
  }

}

function updateAttrs(vnode, oldVnode) {

  let { el, attrs } = vnode, oldAttrs = oldVnode.attrs, api = this
  if (vnode[ env.RAW_COMPONENT ] || !attrs && !oldAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  attrs = attrs || { }

  object.each(
    attrs,
    function (value, name) {
      if (!object.has(oldAttrs, name) || value !== oldAttrs[ name ]) {
        api.setAttr(el, name, value)
      }
    }
  )

  object.each(
    oldAttrs,
    function (value, name) {
      if (!object.has(attrs, name)) {
        api.removeAttr(el, name)
      }
    }
  )

}

export default {
  create: createAttrs,
  update: updateAttrs,
}
