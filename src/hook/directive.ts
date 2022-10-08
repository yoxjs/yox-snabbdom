import {
  Data,
} from 'yox-type/src/type'

import {
  VNode,
} from 'yox-type/src/vnode'

import { DIRECTIVE_HOOKS } from '../field'

export function createDirective(vnode: VNode) {

  const { directives } = vnode
  if (directives) {
    const node = vnode.component || vnode.node as HTMLElement
    if (node) {
      const data = vnode.data as Data
      for (let key in directives) {
        const directive = directives[key], { create } = directive
        data[DIRECTIVE_HOOKS + directive.name] = create(node, directive, vnode)
      }
    }
  }

}

export function callDirectiveHooks(vnode: VNode, name: string) {
  const { directives } = vnode
  if (directives) {
    const data = vnode.data as Data
    for (let key in directives) {
      const directive = directives[key], hooks = data[DIRECTIVE_HOOKS + directive.name]
      if (hooks) {
        const hook = hooks[name]
        if (hook) {
          hook(directive, vnode)
        }
      }
    }
  }
}
