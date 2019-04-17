import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'
import Directive from 'yox-template-compiler/src/vnode/Directive'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { node, directives } = vnode, oldDirectives = oldVnode.directives

  if (directives || oldDirectives) {

    directives = directives || env.EMPTY_OBJECT
    oldDirectives = oldDirectives || env.EMPTY_OBJECT

    object.each(
      directives,
      function (directive: Directive, name: string) {
        if (!oldDirectives[name]) {
          directive.hooks.bind(node, directive, vnode)
        }
        else if (directive.value !== oldDirectives[name].value
          || directive.keypath !== oldDirectives[name].keypath
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
  const { node, directives } = vnode
  if (directives) {
    object.each(
      directives,
      function (directive: Directive) {
        directive.hooks.unbind(node, directive, vnode)
      }
    )
  }
}
