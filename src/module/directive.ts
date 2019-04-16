import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from 'yox-template-compiler/src/vnode/VNode'
import Directive from 'yox-template-compiler/src/vnode/Directive'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { el, directives } = vnode, oldDirectives = oldVnode.directives

  if (directives || oldDirectives) {

    directives = directives || env.EMPTY_OBJECT
    oldDirectives = oldDirectives || env.EMPTY_OBJECT

    object.each(
      directives,
      function (directive: Directive, name: string) {
        if (!oldDirectives[name]) {
          directive.hooks.bind(el, directive, vnode)
        }
        else if (directive.value !== oldDirectives[name].value
          || directive.keypath !== oldDirectives[name].keypath
        ) {
          directive.hooks.update(el, directive, vnode, oldVnode)
        }
      }
    )

    object.each(
      oldDirectives,
      function (directive: Directive, name: string) {
        if (!directives[name]) {
          directive.hooks.unbind(el, directive, oldVnode)
        }
      }
    )

  }

}

export function remove(vnode: VNode) {
  const { el, directives } = vnode
  if (directives) {
    object.each(
      directives,
      function (directive: Directive) {
        directive.hooks.unbind(el, directive, vnode)
      }
    )
  }
}
