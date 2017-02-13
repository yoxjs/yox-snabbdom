
import * as object from 'yox-common/util/object'

function updateStyle(oldVnode, vnode) {

  let oldProps = oldVnode.data.props
  let newProps = vnode.data.props

  if (!oldProps && !newProps) {
    return
  }

  oldProps = oldProps || { }
  newProps = newProps || { }

  let { el } = vnode

  object.each(
    newProps,
    function (value, name) {
      if (value !== oldProps[ name ]) {
        el[ name ] = value
      }
    }
  )

  object.each(
    oldProps,
    function (value, name) {
      if (!object.has(newProps, name)) {
        delete el[ name ]
      }
    }
  )

}

export default {
  create: updateStyle,
  update: updateStyle,
}
