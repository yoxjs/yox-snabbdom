
import * as object from 'yox-common/util/object'

function updateProps(oldVnode, vnode) {

  let oldProps = oldVnode.data.props
  let newProps = vnode.data.props

  if (vnode.component || !oldProps && !newProps) {
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
        api.removeProp(el, name)
      }
    }
  )

}

export default {
  create: updateProps,
  update: updateProps,
}
