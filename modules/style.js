
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

function updateStyle(oldVnode, vnode) {

  let oldStyle = oldVnode.data.style
  let newStyle = vnode.data.style

  if (!oldStyle && !newStyle) {
    return
  }

  oldStyle = oldStyle || { }
  newStyle = newStyle || { }

  let { style } = vnode.elm

  object.each(
    newStyle,
    function (value, name) {
      if (value !== oldStyle[name]) {
        style[name] = value
      }
    }
  )

  object.each(
    oldStyle,
    function (value, name) {
      if (!(object.has(newStyle, name))) {
        style[name] = ''
      }
    }
  )

}

export default {
  create: updateStyle,
  update: updateStyle,
}
