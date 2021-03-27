import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

// 删除 ref 的时候，要确保是相同的节点
// 因为模板中可能出现同一个 ref 名字，出现在不同的地方，
// 这样就可能出现一种特殊情况，即前面刚创建了 ref1，后面又把这个这个新创建的 ref1 删除了
export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { context, ref } = vnode,

  oldRef = oldVnode && oldVnode.ref

  if (ref || oldRef) {

    let refs = context.$refs,

    value = vnode.component || vnode.node as HTMLElement

    if (ref) {
      if (!oldRef) {
        if (!refs) {
          refs = context.$refs = { }
        }
        refs[ref] = value
      }
      else if (ref !== oldRef) {
        if (refs) {
          if (refs[ref] === value) {
            delete refs[ref]
          }
        }
        else {
          refs = context.$refs = { }
        }
        refs[ref] = value
      }
    }
    else if (refs && oldRef && refs[oldRef] === value) {
      delete refs[oldRef]
    }

  }

}

export function remove(api: DomApi, vnode: VNode) {

  const { ref } = vnode
  if (ref) {

    const refs = vnode.context.$refs,

    value = vnode.component || vnode.node as HTMLElement

    if (refs && refs[ref] === value) {
      delete refs[ref]
    }

  }

}