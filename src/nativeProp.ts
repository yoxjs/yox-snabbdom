import {
  VNode,
  Property
} from 'yox-type/src/vnode'

import * as constant from 'yox-type/src/constant'
import * as object from 'yox-common/src/util/object'

export function update(api: any, vnode: VNode, oldVnode?: VNode) {

  const { node, nativeProps } = vnode,

  oldNativeProps = oldVnode && oldVnode.nativeProps

  if (nativeProps || oldNativeProps) {

    const newValue = nativeProps || constant.EMPTY_OBJECT,

    oldValue = oldNativeProps || constant.EMPTY_OBJECT

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