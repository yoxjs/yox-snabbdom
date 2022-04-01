import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { directives } = vnode,

  oldDirectives = oldVNode && oldVNode.directives

  if (directives !== oldDirectives) {

    const node = vnode.component || vnode.node as HTMLElement

    if (directives) {
      const oldValue = oldDirectives || constant.EMPTY_OBJECT
      for (let name in directives) {

        const directive = directives[name],

        oldDirective = oldValue[name],

        { bind, unbind } = directive.hooks

        if (!oldDirective) {
          bind(node, directive, vnode)
        }
        else if (directive.value !== oldDirective.value) {
          if (unbind) {
            unbind(node, oldDirective, oldVNode as VNode)
          }
          bind(node, directive, vnode)
        }
        else if (oldDirective.runtime && directive.runtime) {
          oldDirective.runtime.execute = directive.runtime.execute
          directive.runtime = oldDirective.runtime
        }

      }
    }

    if (oldDirectives) {
      const newValue = directives || constant.EMPTY_OBJECT
      for (let name in oldDirectives) {
        if (!newValue[name]) {
          const { unbind } = oldDirectives[name].hooks
          if (unbind) {
            unbind(node, oldDirectives[name], oldVNode as VNode)
          }
        }
      }
    }

  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { directives } = vnode
  if (directives) {
    const node = vnode.component || vnode.node as HTMLElement
    for (let name in directives) {
      const { unbind } = directives[name].hooks
      if (unbind) {
        unbind(node, directives[name], vnode)
      }
    }
  }
}
