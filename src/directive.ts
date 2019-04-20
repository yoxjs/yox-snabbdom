import * as env from 'yox-common/src/util/env'
import * as object from 'yox-common/src/util/object'

import VNode from 'yox-type/src/vnode/VNode'
import Directive from 'yox-type/src/vnode/Directive'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { data, directives } = vnode, oldDirectives = oldVnode && oldVnode.directives

  if (directives || oldDirectives) {

    const node = data[field.COMPONENT] || vnode.node,

    isKeypathChange = oldVnode && vnode.keypath !== oldVnode.keypath

    directives = directives || env.EMPTY_OBJECT
    oldDirectives = oldDirectives || env.EMPTY_OBJECT

    object.each(
      directives,
      function (directive: Directive, name: string) {
        if (!oldDirectives[name]) {
          directive.hooks.bind(node, directive, vnode)
        }
        else if (directive.value !== oldDirectives[name].value
          || isKeypathChange
        ) {
          directive.hooks.update(node, directive, vnode, oldVnode)
        }
      }
    )

    object.each(
      oldDirectives,
      function (directive: Directive, name: string) {
        if (!directives[name]) {
          directive.hooks.unbind(node, directive, oldVnode)
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
        directive.hooks.unbind(node, directive, vnode)
      }
    )
  }
}
