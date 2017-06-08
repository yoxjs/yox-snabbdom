
import * as object from 'yox-common/util/object'

function createProps(vnode, oldVnode) {

  let { component, props } = vnode
  if (!component && props) {
    let api = this, oldProps = oldVnode && oldVnode.props || { }
    object.each(
      props,
      function (value, name) {
        if (value !== oldProps[ name ]) {
          api.setProp(vnode.el, name, value)
        }
      }
    )
  }

}

function removeProps(vnode, oldVnode) {

  let { component, props } = vnode, oldProps = oldVnode.props, api = this
  if (!component && oldProps) {
    object.each(
      oldProps,
      function (value, name) {
        if (!object.has(props, name)) {
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
  create: createProps,
  update: removeProps,
  postpatch: createProps,
}
