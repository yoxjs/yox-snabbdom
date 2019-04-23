import * as is from 'yox-common/src/util/is'
import * as env from 'yox-common/src/util/env'
import * as array from 'yox-common/src/util/array'
import * as logger from 'yox-common/src/util/logger'

import isDef from 'yox-common/src/function/isDef'

import API from 'yox-type/src/API'
import Yox from 'yox-type/src/Yox'
import VNode from 'yox-type/src/vnode/VNode'
import YoxOptions from 'yox-type/src/options/Yox'

import * as field from './src/field'

import * as nativeAttr from './src/nativeAttr'
import * as nativeProp from './src/nativeProp'
import * as directive from './src/directive'
import * as component from './src/component'

function isPatchable(vnode: VNode, oldVnode: VNode): boolean {
  return vnode.tag === oldVnode.tag
    && vnode.key === oldVnode.key
}

function createKeyToIndex(vnodes: (VNode | void)[], startIndex: number, endIndex: number) {
  let result: Record<string, number> = {}, vnode: VNode | void, key: string | void
  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    if (vnode && (key = vnode.key)) {
      result[key] = startIndex
    }
    startIndex++
  }
  return result
}

function insertBefore(api: API, parentNode: Node, node: Node, referenceNode: Node | void) {
  if (referenceNode) {
    api.before(parentNode, node, referenceNode)
  }
  else {
    api.append(parentNode, node)
  }
}

function createComponent(vnode: VNode, options: YoxOptions) {

  // 渲染同步加载的组件时，vnode.node 为空
  // 渲染异步加载的组件时，vnode.node 不为空，因为初始化用了占位组件
  const child = (vnode.parent || vnode.context).create(options, vnode, vnode.node), node = child.$el

  if (node) {
    vnode.node = node
  }
  else {
    logger.fatal('子组件没有创建元素，那还玩个毛啊')
  }

  vnode.data[field.COMPONENT] = child
  vnode.data[field.LOADING] = env.FALSE

  component.update(vnode)
  directive.update(vnode)

}

let guid = 0

function createData(): Record<string, any> {
  const data = {}
  data[field.ID] = ++guid
  return data
}

function createVnode(api: API, vnode: VNode) {

  const { tag, isComponent, isComment, isText, children, text, context } = vnode, data = createData()

  vnode.data = data

  if (isText) {
    vnode.node = api.createText(text as string)
    return
  }

  if (isComment) {
    vnode.node = api.createComment(text as string)
    return
  }

  if (isComponent) {

    // 如果渲染组件，必须确保有一个占位组件，理由如下：
    // 1. 尽可能的提升用户体验（突然蹦一个组件出来是几个意思？）
    // 2. virtual dom 的每一个节点，最好要有一个真实 node 对应

    // 先用异步方式获取组件
    // 如果是同步加载，会立即赋给 syncOptions
    let syncOptions: Record<string, any> | undefined

    context.component(
      tag as string,
      function (options: YoxOptions | void) {
        if (options) {
          if (isDef(data[field.LOADING])) {
            // 异步组件
            if (data[field.LOADING]) {

              // 尝试使用最新的 vnode
              if (data[field.VNODE]) {
                vnode = data[field.VNODE]
                // 用完就删掉
                delete data[field.VNODE]
              }

              createComponent(vnode, options)

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

    if (syncOptions) {
      createComponent(vnode, syncOptions)
    }
    else {
      vnode.node = api.createComment(env.EMPTY_STRING)
      data[field.LOADING] = env.TRUE
      return
    }

  }
  else {

    const node = vnode.node = api.createElement(vnode.tag as string)

    if (children) {
      addVnodes(api, node, children, 0, children.length - 1)
    }
    else if (text) {
      api.append(
        node,
        api.createText(text)
      )
    }

    nativeAttr.update(api, vnode)
    nativeProp.update(api, vnode)
    component.update(vnode)

    directive.update(vnode)

  }

}

function addVnodes(api: API, parentNode: Node, vnodes: VNode[], startIndex: number, endIndex: number, before?: VNode) {
  let vnode: VNode
  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    createVnode(api, vnode)
    insertVnode(api, parentNode, vnode, before)
    startIndex++
  }
}

function insertVnode(api: API, parentNode: Node, vnode: VNode, before?: VNode) {
  const { node, data } = vnode, hasParent = api.parent(node)
  insertBefore(api, parentNode, node, before ? before.node : env.UNDEFINED)
  if (!hasParent && !data[field.LOADING]) {
    enterVnode(api, vnode)
  }
}

function enterVnode(api: API, vnode: VNode) {

}

function removeVnodes(api: API, parentNode: Node, vnodes: (VNode | void)[], startIndex: number, endIndex: number) {
  let vnode: VNode | void
  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    if (vnode) {
      removeVnode(api, parentNode, vnode)
    }
    startIndex++
  }
}

function removeVnode(api: API, parentNode: Node, vnode: VNode) {
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

function destroyVnode(api: API, vnode: VNode) {

  const { data, children, isComponent, isStatic } = vnode

  if (isComponent) {
    if (vnode.parent === vnode.context) {
      if (data[field.COMPONENT]) {
        data[field.COMPONENT].destroy()
        data[field.COMPONENT] = env.UNDEFINED
        return env.TRUE
      }
      else if (data[field.LOADING]) {
        data[field.LOADING] = env.FALSE
      }
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

  directive.remove(vnode)

}

function leaveVnode(api: API, vnode: VNode, done: Function) {
  done()
}

function updateChildren(api: API, parentNode: Node, newChildren: VNode[], oldChildren: (VNode | void)[]) {

  let newStartIndex = 0,
  newEndIndex = newChildren.length - 1,
  newStartVnode = newChildren[newStartIndex],
  newEndVnode = newChildren[newEndIndex],

  oldStartIndex = 0,
  oldEndIndex = oldChildren.length - 1,
  oldStartVnode = oldChildren[oldStartIndex],
  oldEndVnode = oldChildren[oldEndIndex],

  oldKeyToIndex: Record<string, number> | void,
  oldIndex: number | void,
  activeVnode: VNode | void

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
      patch(api, newStartVnode, oldStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 从尾到头比较，位置相同且值得 patch
    else if (isPatchable(newEndVnode, oldEndVnode)) {
      patch(api, newEndVnode, oldEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

    // 当 oldStartVnode 和 newEndVnode 值得 patch
    // 说明元素被移到右边了
    else if (isPatchable(newEndVnode, oldStartVnode)) {
      patch(api, newEndVnode, oldStartVnode)
      insertBefore(
        api,
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
      patch(api, newStartVnode, oldEndVnode)
      insertBefore(
        api,
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

      oldIndex = newStartVnode.key
        ? oldKeyToIndex[newStartVnode.key]
        : env.UNDEFINED

      // 移动元素
      if (is.number(oldIndex)) {
        activeVnode = oldChildren[oldIndex as number]
        if (activeVnode) {
          patch(api, activeVnode, newStartVnode)
          oldChildren[oldIndex as number] = env.UNDEFINED
        }
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

export function patch(api: API, vnode: VNode, oldVnode: VNode) {

  if (vnode === oldVnode) {
    return
  }

  const { node, data } = oldVnode

  // 如果不能 patch，则直接删除重建
  if (!isPatchable(vnode, oldVnode)) {
    const parentNode = api.parent(node)
    if (parentNode) {
      createVnode(api, vnode)
      insertVnode(api, parentNode, vnode, oldVnode)
      removeVnode(api, parentNode, oldVnode)
    }
    else {
      logger.fatal('parentNode is not found.')
    }
    return
  }

  vnode.node = node
  vnode.data = data

  if (oldVnode.isComponent) {
    if (data[field.LOADING]) {
      data[field.VNODE] = vnode
    }
    return
  }

  if (vnode.isStatic
    && oldVnode.isStatic
  ) {
    return
  }

  // before update
  nativeAttr.update(api, vnode, oldVnode)
  nativeProp.update(api, vnode, oldVnode)

  const newText = vnode.text,
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
  component.update(vnode, oldVnode)

}

export function create(api: API, node: Node, context: Yox, keypath: string): VNode {

  return {
    tag: api.tag(node),
    data: createData(),
    node,
    context,
    keypath,
  }

}

export function destroy(api: API, vnode: VNode) {

}
