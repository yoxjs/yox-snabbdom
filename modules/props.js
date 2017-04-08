
import * as is from 'yox-common/util/is'
import * as char from 'yox-common/util/char'
import * as object from 'yox-common/util/object'

function updateProps(oldVnode, vnode) {

  let oldProps = oldVnode.data.props
  let newProps = vnode.data.props

  if (!oldProps && !newProps) {
    return
  }

  oldProps = oldProps || { }
  newProps = newProps || { }

  let { el } = vnode
  let api = this

  object.each(
    newProps,
    function (value, name) {
      if (value !== oldProps[ name ]) {
        api.setProp(el, name, value)
      }
    }
  )

  object.each(
    oldProps,
    function (value, name) {
      if (!object.has(newProps, name)) {
        if (is.string(value)) {
          el[ name ] = char.CHAR_BLANK
        }
        api.removeProp(el, name)
      }
    }
  )

}

export default {
  create: updateProps,
  update: updateProps,
}
