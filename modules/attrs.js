
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

  object.each(
    newAttrs,
    function (value, name) {
      if (object.has(newAttrs, name)) {
        if (!object.has(oldAttrs, name) || value !== oldAttrs[ name ]) {
          api.setAttr(el, name, value)
        }
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
