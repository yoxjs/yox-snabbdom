
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as object from 'yox-common/util/object'

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (vnode.component || !oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { el } = vnode
  let api = this

  let getValue = function (attrs, name) {
    if (object.has(attrs, name)) {
      return attrs[ name ] || char.CHAR_BLANK
    }
  }

  object.each(
    newAttrs,
    function (value, name) {
      value = getValue(newAttrs, name)
      if (value !== getValue(oldAttrs, name)) {
        api.setAttr(el, name, value)
      }
    }
  )

  object.each(
    oldAttrs,
    function (value, name) {
      if (!object.has(newAttrs, name)) {
        api.removeAttr(el, name)
      }
    }
  )

}

export default {
  create: updateAttrs,
  update: updateAttrs,
}
