import {
  Data,
} from 'yox-type/src/type'

import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import { DIRECTIVE_HOOKS } from '../field'

export function afterCreate(api: DomApi, vnode: VNode) {

  const { directives, component, node } = vnode
  if (directives) {
    const data = vnode.data as Data, element = component ? component.$el : node
    if (element) {
      for (let key in directives) {
        const directive = directives[key], { create } = directive
        data[DIRECTIVE_HOOKS + directive.name] = create(element as HTMLElement, directive)
      }
    }
  }

}

function callDirectiveHooks(vnode: VNode, name: string) {
  const { directives } = vnode
  if (directives) {
    const data = vnode.data as Data
    for (let key in directives) {
      const directive = directives[key], hooks = data[DIRECTIVE_HOOKS + directive.name]
      if (hooks) {
        const hook = hooks[name]
        if (hook) {
          hook(directive)
        }
      }
    }
  }
}

export function afterMount(api: DomApi, vnode: VNode) {
  callDirectiveHooks(vnode, 'afterMount')
}

export function beforeUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {
  callDirectiveHooks(vnode, 'beforeUpdate')
}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {
  callDirectiveHooks(vnode, 'afterUpdate')
}

export function beforeDestroy(api: DomApi, vnode: VNode) {
  callDirectiveHooks(vnode, 'beforeDestroy')
}