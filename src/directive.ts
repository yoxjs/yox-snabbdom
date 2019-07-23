import {
  VNode,
} from 'yox-type/src/vnode'

import * as constant from 'yox-type/src/constant'

import * as field from './field'

export function update(vnode: VNode, oldVnode?: VNode) {

  const { data, directives } = vnode,

  oldDirectives = oldVnode && oldVnode.directives

  if (directives || oldDirectives) {

    const node = data[field.COMPONENT] || vnode.node,

    isKeypathChange = oldVnode && vnode.keypath !== oldVnode.keypath,

    newValue = directives || constant.EMPTY_OBJECT,

    oldValue = oldDirectives || constant.EMPTY_OBJECT


    for (let name in newValue) {

      const directive = newValue[name],

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

    for (let name in oldValue) {
      if (!newValue[name]) {
        const { unbind } = oldValue[name].hooks
        if (unbind) {
          unbind(node, oldValue[name], oldVnode as VNode)
        }
      }
    }

  }

}

export function remove(vnode: VNode) {
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
