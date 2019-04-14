import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import Element from '../vnode/Element'
import Property from '../vnode/Property'

export function create(api: any, vnode: Element) {

  let { el, props } = vnode

  if (props) {
    object.each(
      props,
      function (prop: Property, name: string) {
        api.setProp(el, name, prop.value)
      }
    )
  }

}

export function update(api: any, vnode: Element, oldVnode: Element) {

  let { el, props } = vnode, oldProps = oldVnode.props

  if (props || oldProps) {

    props = props || env.EMPTY_OBJECT
    oldProps = oldProps || env.EMPTY_OBJECT

    object.each(
      props,
      function (attr: Property, name: string) {
        if (!oldProps[name]
          || attr.value !== oldProps[name].value
        ) {
          api.setProp(el, name, attr.value)
        }
      }
    )

    object.each(
      oldProps,
      function (attr: Property, name: string) {
        if (!props[name]) {
          api.removeProp(el, name, attr.hint)
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
// export default {
//   create: createProps,
//   update: removeProps,
//   postpatch: createProps,
// }
