import {
  VNode,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

export function afterCreate(api: DomApi, vnode: VNode) {

  const ref = vnode.ref
  if (ref) {

    const context = vnode.context

    let $refs = context.$refs
    if (!$refs) {
      $refs = context.$refs = { }
    }

    $refs[ref] = vnode.component || vnode.node as HTMLElement

  }

}

// 删除 ref 的时候，要确保是相同的节点
// 因为模板中可能出现同一个 ref 名字，出现在不同的地方，
// 这样就可能出现一种特殊情况，即前面刚创建了 ref1，后面又把这个这个新创建的 ref1 删除了
export function beforeUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newRef = vnode.ref, oldRef = oldVNode.ref
  if (newRef || oldRef) {

    const context = vnode.context,

    node = vnode.component || vnode.node as HTMLElement

    let $refs = context.$refs

    if (newRef) {
      if (!oldRef) {
        if (!$refs) {
          $refs = context.$refs = { }
        }
        $refs[newRef] = node
      }
      else if (newRef !== oldRef) {
        if ($refs) {
          if ($refs[newRef] === node) {
            delete $refs[newRef]
          }
        }
        else {
          $refs = context.$refs = { }
        }
        $refs[newRef] = node
      }
    }
    else if ($refs && oldRef && $refs[oldRef] === node) {
      delete $refs[oldRef]
    }

  }

}

export function beforeDestroy(api: DomApi, vnode: VNode) {

  const { ref } = vnode
  if (ref) {

    const { $refs } = vnode.context,

    node = vnode.component || vnode.node as HTMLElement

    if ($refs && $refs[ref] === node) {
      delete $refs[ref]
    }

  }

}