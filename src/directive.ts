import * as env from 'yox-common/src/util/env'
import * as object from 'yox-common/src/util/object'

import VNode from 'yox-type/src/vnode/VNode'
import Directive from 'yox-type/src/vnode/Directive'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  const { data, directives } = vnode, oldDirectives = oldVnode && oldVnode.directives

  if (directives || oldDirectives) {

    const node = data[field.COMPONENT] || vnode.node,

    isKeypathChange = oldVnode && vnode.keypath !== oldVnode.keypath,

    newValue = directives || env.EMPTY_OBJECT,

    oldValue = oldDirectives || env.EMPTY_OBJECT

    object.each(
      newValue,
      function (directive: Directive, name: string) {
        if (!oldValue[name]) {
          directive.hooks.bind(node, directive, vnode)
        }
        else if (directive.value !== oldValue[name].value
          || isKeypathChange
        ) {
          const { update } = directive.hooks
          if (update) {
            update(node, directive, vnode, oldVnode as VNode)
          }
        }
      }
    )

    object.each(
      oldValue,
      function (directive: Directive, name: string) {
        if (!newValue[name]) {
          const { unbind } = directive.hooks
          if (unbind) {
            unbind(node, directive, oldVnode as VNode)
          }
        }
      }
    )

  }

}

export function remove(vnode: VNode) {
  const { directives } = vnode
  if (directives) {
    const node = vnode.data[field.COMPONENT] || vnode.node
    object.each(
      directives,
      function (directive: Directive) {
        const { unbind } = directive.hooks
        if (unbind) {
          unbind(node, directive, vnode)
        }
      }
    )
  }
}
