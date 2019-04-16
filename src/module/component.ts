
import * as config from 'yox-config'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'

export function update(vnode: VNode, oldVnode?: VNode) {

  let el = vnode.el,
  nativeAttrs = vnode.nativeAttrs,
  model = vnode.model,
  instance = vnode.instance,
  ref = vnode.ref

  if (vnode.isComponent) {

  }
  if (vnode[ env.RAW_COMPONENT ]) {
    el = this[ env.RAW_COMPONENT ](vnode.data.id)
    if (nativeAttrs) {
      // 如果有双向绑定，要把它的值取出来放进 nativeAttrs
      let modelField = el.$model
      if (model && modelField && !object.has(nativeAttrs, modelField)) {
        nativeAttrs[ modelField ] = instance.get(model)
      }
      el.set(el.checkPropTypes(nativeAttrs))
    }
    el.set(vnode.slots)
  }

  if (ref) {
    instance.$refs[ref] = el
  }

}
