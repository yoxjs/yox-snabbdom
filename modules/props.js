
import * as object from 'yox-common/util/object'

function setProps(oldVnode, vnode) {

  let newProps = vnode.data.props
  if (newProps) {
    let api = this, oldProps = oldVnode.data.props || { }
    object.each(
      newProps,
      function (value, name) {
        if (value !== oldProps[ name ]) {
          api.setProp(vnode.el, name, value)
          if (oldVnode.children) {
            delete oldVnode.children
          }
        }
      }
    )
  }

}

function removeProps(oldVnode, vnode) {

  let oldProps = oldVnode.data.props
  if (oldProps) {
    let api = this, newProps = vnode.data.props || { }
    object.each(
      oldProps,
      function (value, name) {
        if (!object.has(newProps, name)) {
          api.removeProp(vnode.el, name)
        }
      }
    )
  }

}

//
// 旧 [ child1, child2 ]
// 新 innerHTML
//
// 这种情况，要让外部先把 child1 child2 正常移除掉，再用 innerHTML 覆盖，否则指令无法销毁
//
// 旧 innerHTML
// 新 [ child1, child2 ]
//
// 这种情况，先用 innerHTML 覆盖，再处理 child1 child2
//
export default {
  create: setProps,
  update: removeProps,
  postpatch: setProps,
}
