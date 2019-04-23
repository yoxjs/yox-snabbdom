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

function createComponent(vnode: VNode, options: YoxOptions | void) {

  if (!options) {
    logger.fatal(`component [${vnode.tag}] is not found.`)
    return
  }

  // 渲染同步加载的组件时，vnode.node 为空
  // 渲染异步加载的组件时，vnode.node 不为空，因为初始化用了占位节点
  const child = (vnode.parent || vnode.context).create(options, vnode, vnode.node),

  // 组件初始化创建的元素
  node = child.$el as Node

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

  return child

}

let guid = 0

function createData(): Record<string, any> {
  const data = {}
  data[field.ID] = ++guid
  return data
}

function createVnode(api: API, vnode: VNode) {

  const { tag, isComponent, isComment, isText, children, text, html, context } = vnode, data = createData()

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

    let isAsync = env.TRUE

    context.component(
      tag as string,
      function (options: any) {
        if (isDef(data[field.LOADING])) {
          // 异步组件
          if (data[field.LOADING]) {
            // 尝试使用最新的 vnode
            if (data[field.VNODE]) {
              vnode = data[field.VNODE]
              // 用完就删掉
              delete data[field.VNODE]
            }
            enterVnode(
              api,
              vnode,
              createComponent(vnode, options)
            )
          }
        }
        // 同步组件
        else {
          createComponent(vnode, options)
          isAsync = env.FALSE
        }
      }
    )

    if (isAsync) {
      vnode.node = api.createComment(env.RAW_COMPONENT)
      data[field.LOADING] = env.TRUE
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
    else if (html) {
      api.html(node as HTMLElement, html)
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

  const { node, data } = vnode,

  hasParent = api.parent(node)

  // 这里不调用 insertBefore，避免判断两次
  if (before) {
    api.before(parentNode, node, before.node)
  }
  else {
    api.append(parentNode, node)
  }

  // 普通元素和组件的占位节点都会走到这里
  // 但是占位节点不用 enter，而是等组件加载回来之后再调 enter
  if (!hasParent) {
    if (vnode.isComponent) {
      const component = data[field.COMPONENT]
      if (component) {
        enterVnode(api, vnode, component)
      }
    }
    else {
      enterVnode(api, vnode)
    }
  }

}

function enterVnode(api: API, vnode: VNode, component?: Yox) {
  // 如果组件根元素和组件本身都写了 transition
  // 优先用外面定义的
  // 因为这明确是在覆盖配置
  let transition = vnode.transition
  if (component) {
    // 再看组件根元素是否有 transition
    if (!transition) {
      transition = (component.$vnode as VNode).transition
    }
    console.log('enter component', vnode, transition)
  }
  else {
    console.log('enter element', vnode, transition)
  }
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
  const node = vnode.node
  if (vnode.isStatic || vnode.isComment || vnode.isText) {
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

  const { data, children } = vnode

  if (vnode.isComponent) {
    if (vnode.parent === vnode.context) {
      const component = data[field.COMPONENT]
      if (component) {
        component.destroy()
        return env.TRUE
      }
      else if (data[field.LOADING]) {
        data[field.LOADING] = env.FALSE
      }
    }
    else {
      return
    }
  }
  else if (children) {
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
  console.log('leave', vnode)
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
console.log('>>>>>>>>>>>>>>>> patch', vnode, oldVnode)
  if (vnode === oldVnode) {
    return
  }

  const { node, data } = oldVnode

  // 如果不能 patch，则直接删除重建
  if (!isPatchable(vnode, oldVnode)) {
    // 同步加载的组件，初始化时不会传入占位节点
    // 它内部会自动生成一个注释节点，当 vnode 和注释节点对比时，必然无法 patch
    // 于是走进此分支，为新组件创建一个 DOM 节点，然后继续 createComponent 后面的流程
    const parentNode = api.parent(node)
    createVnode(api, vnode)
    if (parentNode) {
      insertVnode(api, parentNode, vnode, oldVnode)
      removeVnode(api, parentNode, oldVnode)
    }
    return
  }

  vnode.node = node
  vnode.data = data

  if (oldVnode.isComponent && data[field.LOADING]) {
    data[field.VNODE] = vnode
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
  component.update(vnode, oldVnode)
  directive.update(vnode)

  const newText = vnode.text,
  newHtml = vnode.html,
  newChildren = vnode.children,

  oldText = oldVnode.text,
  oldHtml = oldVnode.html,
  oldChildren = oldVnode.children

  if (is.string(newText)) {
    if (newText !== oldText) {
      api.text(node, newText)
    }
  }
  else if (is.string(newHtml)) {
    if (newHtml !== oldHtml) {
      api.html(node as HTMLElement, newHtml)
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
      if (is.string(oldText) || is.string(oldHtml)) {
        api.text(node, env.EMPTY_STRING)
      }
      addVnodes(api, node, newChildren, 0, newChildren.length - 1)
    }
    // 有旧的没新的 - 删除节点
    else if (oldChildren) {
      removeVnodes(api, node, oldChildren, 0, oldChildren.length - 1)
    }
    // 有旧的 text 没有新的 text
    else if (is.string(oldText) || is.string(oldHtml)) {
      api.text(node, env.EMPTY_STRING)
    }
  }

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
