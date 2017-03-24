
import * as object from 'yox-common/util/object'

import * as domApi from '../htmldomapi'

function updateProps(oldVnode, vnode) {

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
        domApi.setProp(el, name, value)
      }
    }
  )

  object.each(
    oldProps,
    function (value, name) {
      if (!object.has(newProps, name)) {
        domApi.removeProp(el, name)
      }
    }
  )

}

export default {
  create: updateProps,
  update: updateProps,
}
