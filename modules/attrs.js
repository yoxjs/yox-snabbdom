
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (!oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { el } = vnode
  let api = this

  let getValue = function (attrs, name) {
    if (object.has(attrs, name)) {
      return attrs[ name ] !== env.UNDEFINED
        ? attrs[ name ]
        : name
    }
  }

  object.each(
    newAttrs,
    function (value, name) {
      if (getValue(newAttrs, name) !== getValue(oldAttrs, name)) {
        api.setAttr(el, name, value)
      }
    }
  )

  object.each(
    oldAttrs,
    function (value, name) {
      if (!object.has(newAttrs, name)) {
        api.removeProp(el, name)
      }
    }
  )

}

export default {
  create: updateAttrs,
  update: updateAttrs,
}
