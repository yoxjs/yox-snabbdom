import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

export function afterCreate(api: DomApi, vnode: VNode) {

  const { directives } = vnode
  if (directives) {

    const node = vnode.component || vnode.node as HTMLElement

    for (let name in directives) {

      const directive = directives[name],

      { bind } = directive.hooks

      bind(node, directive, vnode)

    }

  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newDirectives = vnode.directives,

  oldDirectives = oldVNode && oldVNode.directives

  if (newDirectives !== oldDirectives) {

    const node = vnode.component || vnode.node as HTMLElement

    if (newDirectives) {
      const oldValue = oldDirectives || constant.EMPTY_OBJECT
      for (let name in newDirectives) {

        const directive = newDirectives[name],

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
      const newValue = newDirectives || constant.EMPTY_OBJECT
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

export function beforeDestroy(api: DomApi, vnode: VNode) {
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
