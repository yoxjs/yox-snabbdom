import {
  YoxInterface,
} from 'yox-type/src/yox'

import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { node, component, context, ref } = vnode,

  oldRef = oldVnode && oldVnode.ref,

  refs = context.$refs as Record<string, YoxInterface | HTMLElement>

  if (ref) {
    if (ref !== oldRef) {
      refs[ref] = component || node as HTMLElement
    }
  }
  else if (oldRef) {
    delete refs[oldRef]
  }

}

export function remove(api: DomApi, vnode: VNode) {

  const { ref, context } = vnode
  if (ref) {
    const refs = context.$refs as Record<string, YoxInterface | HTMLElement>
    delete refs[ref]
  }

}