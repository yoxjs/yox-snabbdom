import * as config from 'yox-config'

import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'
import * as string from 'yox-common/util/string'
import * as logger from 'yox-common/util/logger'

import isDef from 'yox-common/function/isDef'
import execute from 'yox-common/function/execute'
import toString from 'yox-common/function/toString'

import VNode from 'yox-template-compiler/src/vnode/VNode'

import * as nativeAttr from './src/module/attr'
import * as nativeProp from './src/module/prop'
import * as directive from './src/module/directive'
import * as component from './src/module/component'

function isPatchable(vnode: VNode, oldVnode: VNode): boolean {
  return vnode.tag === oldVnode.tag
    && vnode.key === oldVnode.key
}

function createKeyToIndex(vnodes: VNode[], startIndex: number, endIndex: number) {
  let result: Record<string, number> = { }, key: string | void
  while (startIndex <= endIndex) {
    key = vnodes[startIndex].key
    if (key) {
      result[key] = startIndex
    }
    startIndex++
  }
  return result
}

function createComponent(api: any, vnode: VNode, options: Record<string, any>) {

  // 渲染同步加载的组件时，vnode.node 为空
  const component = (vnode.parent || vnode.instance).create(options, vnode, vnode.node)

  vnode.node = component.$node
  vnode.component = component

}

function createVnode(api: any, vnode: VNode): Node {

  const { tag, isComponent, isComment, isText, children, text, instance } = vnode

  if (isText) {
    return vnode.node = api.createText(text)
  }

  if (isComment) {
    return vnode.node = api.createComment(text)
  }

  if (isComponent) {

    // 如果渲染组件，必须确保有一个占位组件，理由如下：
    // 1. 尽可能的提升用户体验（突然蹦一个组件出来是几个意思？）
    // 2. virtual dom 的每一个节点，最好要有一个真实 node 对应

    // 先用异步方式获取组件
    // 如果是同步加载，会立即赋给 syncOptions
    let syncOptions: Record<string, any> | void

    instance.component(
      tag,
      function (options: Record<string, any> | void) {
        if (options) {
          // 异步组件
          if (syncOptions) {
            const latest = api.vnode(vnode.node)
            if (latest && tag === latest.tag) {
              createComponent(api, latest, options)
            }
          }
          // 同步组件
          else {
            syncOptions = options
          }
        }
        else {
          logger.fatal(`component <${tag}> is not found.`)
        }
      }
    )

    // 如果是异步加载，则用默认的 Placeholder 组件
    // 外部必须配置这个组件，否则就别用了
    if (!syncOptions) {
      syncOptions = instance.component('Placeholder')
      vnode.isLoading = env.TRUE
    }

    if (syncOptions) {
      createComponent(api, vnode, syncOptions)
    }
    // 任性的代价就是 fatal
    else {
      logger.fatal('component <Placeholder> is not found.')
    }

  }
  else {

    const node = vnode.node = api.createElement(vnode.tag)

    api.vnode(node, vnode.id, vnode)

    if (children) {
      addVnodes(api, node, children, 0, children.length - 1)
    }
    else if (text) {
      api.append(
        node,
        api.createText(text)
      )
    }

  }

  if (!vnode.isLoading) {
    nativeAttr.create(api, vnode)
    nativeProp.create(api, vnode)
    directive.update(vnode)
  }

}

function addVnodes(api: any, parentNode: Node, vnodes: VNode[], startIndex: number, endIndex: number, before?: VNode) {
  let vnode: VNode
  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    createVnode(api, vnode)
    insertVnode(api, parentNode, vnode, before)
    startIndex++
  }
}

function insertVnode(api: any, parentNode: Node, vnode: VNode, before?: VNode) {
  const hasParent = api.parent(vnode.node)
  api.before(parentNode, vnode.node, before ? before.node : env.UNDEFINED)
  if (!hasParent && !vnode.isLoading) {
    enterVnode(api, vnode)
  }
}

function enterVnode(api: any, vnode: VNode) {

}

function removeVnodes(api: any, parentNode: Node, vnodes: VNode[], startIndex: number, endIndex: number) {
  let vnode: VNode
  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    if (vnode) {
      removeVnode(api, parentNode, vnode)
    }
    startIndex++
  }
}

function removeVnode(api: any, parentNode: Node, vnode: VNode) {
  let node = vnode.node
  if (vnode.isComment || vnode.isText) {
    api.remove(parentNode, node)
  }
  else {
    leaveVnode(
      api,
      vnode,
      function () {
        if (!destroyVnode(api, vnode)) {
          api.remove(parentNode, node)
        }
      }
    )
  }
}

function destroyVnode(api: any, vnode: VNode) {

  const { children, isComponent, isStatic, component } = vnode

  if (isComponent) {
    if (vnode.parent === vnode.instance) {
      if (component) {
        component.destroy()
        return env.TRUE
      }
    }
    else {
      return
    }
  }
  else if (!isStatic && children) {
    array.each(
      children,
      function (child: VNode) {
        destroyVnode(api, child)
      }
    )
  }
}

function leaveVnode(api: any, vnode: VNode, done: Function) {
  done()
}

function updateChildren(api: any, parentNode: Node, newChildren: VNode[], oldChildren: VNode[]) {

  let newStartIndex = 0,
  newEndIndex = newChildren.length - 1,
  newStartVnode = newChildren[newStartIndex],
  newEndVnode = newChildren[newEndIndex],

  oldStartIndex = 0,
  oldEndIndex = oldChildren.length - 1,
  oldStartVnode = oldChildren[oldStartIndex],
  oldEndVnode = oldChildren[oldEndIndex],

  oldKeyToIndex: Record<string, number>,
  oldIndex: number,
  activeVnode: VNode

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {

    // 下面有设为 NULL 的逻辑
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex] // Vnode has been moved left
    }
    else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 从头到尾比较，位置相同且值得 patch
    else if (isPatchable(newStartVnode, oldStartVnode)) {
      patchVnode(api, newStartVnode, oldStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 从尾到头比较，位置相同且值得 patch
    else if (isPatchable(newEndVnode, oldEndVnode)) {
      patchVnode(api, newEndVnode, oldEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

    // 当 oldStartVnode 和 newEndVnode 值得 patch
    // 说明元素被移到右边了
    else if (isPatchable(newEndVnode, oldStartVnode)) {
      patchVnode(api, newEndVnode, oldStartVnode)
      api.before(
        parentNode,
        oldStartVnode.node,
        api.next(oldEndVnode.node)
      )
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 当 oldEndVnode 和 newStartVnode 值得 patch
    // 说明元素被移到左边了
    else if (isPatchable(newStartVnode, oldEndVnode)) {
      patchVnode(api, newStartVnode, oldEndVnode)
      api.before(
        parentNode,
        oldEndVnode.node,
        oldStartVnode.node
      )
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 尝试同级元素的 key
    else {

      if (!oldKeyToIndex) {
        oldKeyToIndex = createKeyToIndex(oldChildren, oldStartIndex, oldEndIndex)
      }

      oldIndex = newStartVnode.key && oldKeyToIndex[newStartVnode.key]

      // 移动元素
      if (is.number(oldIndex)) {
        activeVnode = oldChildren[oldIndex]
        patchVnode(api, activeVnode, newStartVnode)
        oldChildren[oldIndex] = env.UNDEFINED
      }
      // 新元素
      else {
        createVnode(api, newStartVnode)
        activeVnode = newStartVnode
      }

      if (activeVnode) {
        insertVnode(api, parentNode, activeVnode, oldStartVnode)
      }

      newStartVnode = newChildren[++newStartIndex]

    }
  }

  if (oldStartIndex > oldEndIndex) {
    addVnodes(
      api,
      parentNode,
      newChildren,
      newStartIndex,
      newEndIndex,
      newChildren[newEndIndex + 1]
    )
  }
  else if (newStartIndex > newEndIndex) {
    removeVnodes(
      api,
      parentNode,
      oldChildren,
      oldStartIndex,
      oldEndIndex
    )
  }
}

function patchVnode(api: any, vnode: VNode, oldVnode: VNode) {

  const { node, isComponent } = oldVnode

  if (!node || oldVnode === vnode) {
    return
  }

  // 如果不能 patch，则直接删除重建
  if (!isPatchable(vnode, oldVnode)) {
    createVnode(api, vnode)
    const parentNode = api.parent(node)
    if (parentNode) {
      insertVnode(api, parentNode, vnode, oldVnode)
      removeVnode(api, parentNode, oldVnode)
    }
    return
  }

  vnode.node = node

  if (isComponent) {
    api.vnode(node)

    let { id } = vnode.data
    component = api[env.RAW_COMPONENT](id)
    if (!component.set) {
      api[env.RAW_COMPONENT](id, vnode)
      return;
    }
  }

  // before update

  let newText = vnode.text,
  newChildren = vnode.children,

  oldText = oldVnode.text,
  oldChildren = oldVnode.children

  if (is.string(newText)) {
    if (newText !== oldText) {
      api.text(node, newText)
    }
  }
  else {
    // 两个都有需要 diff
    if (newChildren && oldChildren) {
      if (newChildren !== oldChildren) {
        updateChildren(api, node, newChildren, oldChildren)
      }
    }
    // 有新的没旧的 - 新增节点
    else if (newChildren) {
      if (is.string(oldText)) {
        api.text(node, env.EMPTY_STRING)
      }
      addVnodes(api, node, newChildren, 0, newChildren.length - 1)
    }
    // 有旧的没新的 - 删除节点
    else if (oldChildren) {
      removeVnodes(api, node, oldChildren, 0, oldChildren.length - 1)
    }
    // 有旧的 text 没有新的 text
    else if (is.string(oldText)) {
      api.text(node, env.EMPTY_STRING)
    }
  }

  // after update

}

export function patch(api: any, vnode: VNode, oldVnode: VNode) {

}