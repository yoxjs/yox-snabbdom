import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import VNode from '../vnode/VNode'
import Directive from '../vnode/Directive'

export function update(vnode: VNode, oldVnode?: VNode) {

  let { directives } = vnode, oldDirectives = oldVnode.directives

  if (directives || oldDirectives) {

    directives = directives || env.EMPTY_OBJECT
    oldDirectives = oldDirectives || env.EMPTY_OBJECT

    object.each(
      directives,
      function (directive: Directive, name: string) {
        if (!oldDirectives[name]) {
          directive.lifecycle.bind()
        }
        else if (directive.value !== oldDirectives[name].value) {
          directive.lifecycle.update()
        }
      }
    )

    object.each(
      oldDirectives,
      function (directive: Directive, name: string) {
        if (!directives[name]) {
          directive.lifecycle.unbind()
        }
      }
    )

  }

}

export function remove(vnode: VNode) {
  const { directives } = vnode
  if (directives) {
    object.each(
      directives,
      function (directive: Directive) {
        directive.lifecycle.unbind()
      }
    )
  }
}
