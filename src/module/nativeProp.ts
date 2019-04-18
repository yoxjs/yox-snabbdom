import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'
import Property from 'yox-template-compiler/src/vnode/Property'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  let { node, nativeProps } = vnode, oldNativeProps = oldVnode && oldVnode.nativeProps

  if (nativeProps || oldNativeProps) {

    nativeProps = nativeProps || env.EMPTY_OBJECT
    oldNativeProps = oldNativeProps || env.EMPTY_OBJECT

    object.each(
      nativeProps,
      function (prop: Property, name: string) {
        if (!oldNativeProps[name]
          || prop.value !== oldNativeProps[name].value
        ) {
          api.prop(node, name, prop.value)
        }
      }
    )

    object.each(
      oldNativeProps,
      function (prop: Property, name: string) {
        if (!nativeProps[name]) {
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
