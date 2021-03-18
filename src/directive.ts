import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'

import * as field from './field'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { data, directives } = vnode,

  oldDirectives = oldVnode && oldVnode.directives

  if (directives || oldDirectives) {

    const node = data[field.COMPONENT] || vnode.node,

    isKeypathChange = oldVnode && vnode.keypath !== oldVnode.keypath,

    newValue = directives || constant.EMPTY_OBJECT,

    oldValue = oldDirectives || constant.EMPTY_OBJECT


    if (directives) {
      for (let name in directives) {

        const directive = directives[name],

        { once, bind, unbind } = directive.hooks

        if (!oldValue[name]) {
          bind(node, directive, vnode)
        }
        else if (once
          || directive.value !== oldValue[name].value
          || isKeypathChange
        ) {
          if (unbind) {
            unbind(node, oldValue[name], oldVnode as VNode)
          }
          bind(node, directive, vnode)
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
  const { directives } = vnode
  if (directives) {
    const node = vnode.data[field.COMPONENT] || vnode.node
    for (let name in directives) {
      const { unbind } = directives[name].hooks
      if (unbind) {
        unbind(node, directives[name], vnode)
      }
    }
  }
}
