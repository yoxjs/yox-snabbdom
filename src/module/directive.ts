import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as object from 'yox-common/src/util/object'
import * as constant from 'yox-common/src/util/constant'

import * as field from '../field'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { data, directives } = vnode,

  oldDirectives = oldVnode && oldVnode.directives

  if (directives || oldDirectives) {

    const node = data[field.COMPONENT] || vnode.node,

    newValue = directives || constant.EMPTY_OBJECT,

    oldValue = oldDirectives || constant.EMPTY_OBJECT

    if (directives) {
      for (let name in directives) {

        const directive = directives[name],

        oldDirective = oldValue[name],

        { bind, unbind } = directive.hooks

        if (!oldDirective) {
          bind(node, directive, vnode)
        }
        else if (directive.value !== oldDirective.value) {
          if (unbind) {
            unbind(node, oldDirective, oldVnode as VNode)
          }
          bind(node, directive, vnode)
        }
        else if (oldDirective.runtime && directive.runtime) {
          object.extend(oldDirective.runtime, directive.runtime)
          // 在当前节点传递 oldDirective.runtime 的引用
          directive.runtime = oldDirective.runtime
        }

      }
    }

    if (oldDirectives) {
      for (let name in oldDirectives) {
        if (!newValue[name]) {
          const { unbind } = oldDirectives[name].hooks
          if (unbind) {
            unbind(node, oldDirectives[name], oldVnode as VNode)
          }
        }
      }
    }

  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { data, directives } = vnode
  if (directives) {
    const node = data[field.COMPONENT] || vnode.node
    for (let name in directives) {
      const { unbind } = directives[name].hooks
      if (unbind) {
        unbind(node, directives[name], vnode)
      }
    }
  }
}
