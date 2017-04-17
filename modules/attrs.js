
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (vnode.data.component || !oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { el } = vnode
  let api = this

  let getValue = function (attrs, name) {
    if (object.has(attrs, name)) {
      let { value } = attrs[ name ]
      return value !== env.UNDEFINED ? value : name
    }
  }

  object.each(
    newAttrs,
    function (node, name) {
      if (getValue(newAttrs, name) !== getValue(oldAttrs, name)) {
        api.setAttr(el, name, node.value)
      }
    }
  )

  object.each(
    oldAttrs,
    function (node, name) {
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
