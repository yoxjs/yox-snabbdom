import * as env from 'yox-common/src/util/env'
import * as object from 'yox-common/src/util/object'

import VNode from 'yox-type/src/vnode/VNode'
import Property from 'yox-type/src/vnode/Property'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeProps } = vnode,

  oldNativeProps = oldVnode && oldVnode.nativeProps
  console.log('prop update', vnode, oldVnode)
  if (nativeProps || oldNativeProps) {

    const newValue = nativeProps || env.EMPTY_OBJECT,

    oldValue = oldNativeProps || env.EMPTY_OBJECT

    object.each(
      newValue,
      function (prop: Property, name: string) {
        if (!oldValue[name]
          || prop.value !== oldValue[name].value
        ) {
          api.prop(node, name, prop.value)
        }
      }
    )

    object.each(
      oldValue,
      function (prop: Property, name: string) {
        if (!newValue[name]) {
          api.removeProp(node, name, prop.hint)
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
