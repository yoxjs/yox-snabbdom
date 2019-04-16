
import * as config from 'yox-config'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'

export function update(vnode: VNode, oldVnode?: VNode) {

  let el = vnode.el,
  props = vnode.props,
  model = vnode.model,
  instance = vnode.instance,
  ref = vnode.ref

  if (vnode.isComponent) {

  }
  if (vnode[ env.RAW_COMPONENT ]) {
    el = this[ env.RAW_COMPONENT ](vnode.data.id)
    if (props) {
      // 如果有双向绑定，要把它的值取出来放进 props
      let modelField = el.$model
      if (model && modelField && !object.has(props, modelField)) {
        props[ modelField ] = instance.get(model)
      }
      el.set(el.checkPropTypes(props))
    }
    el.set(vnode.slots)
  }

  if (ref) {
    instance.$refs[ref] = el
  }

}
