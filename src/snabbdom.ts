import {
  VNODE_TYPE_TEXT,
  VNODE_TYPE_COMMENT,
  VNODE_TYPE_ELEMENT,
  VNODE_TYPE_FRAGMENT,
  VNODE_TYPE_SLOT,
} from 'yox-config/src/config'

import {
  Data,
} from 'yox-type/src/type'

import {
  DomApi,
} from 'yox-type/src/api'

import {
  VNode,
  VNodeOperator,
} from 'yox-type/src/vnode'

import {
  ComponentOptions,
} from 'yox-type/src/options'

import {
  YoxInterface,
} from 'yox-type/src/yox'

import * as is from 'yox-common/src/util/is'
import * as object from 'yox-common/src/util/object'
import * as logger from 'yox-common/src/util/logger'
import * as constant from 'yox-common/src/util/constant'

import * as directiveHook from './hook/directive'
import * as eventHook from './hook/event'
import * as modelHook from './hook/model'
import * as nativeAttrHook from './hook/nativeAttr'
import * as nativeStyleHook from './hook/nativeStyle'
import * as refHook from './hook/ref'

import * as field from './field'

function getFragmentHostNode(api: DomApi, vnode: VNode): Node {
  if (vnode.type === VNODE_TYPE_FRAGMENT
    || vnode.type === VNODE_TYPE_SLOT
  ) {
    const child = (vnode.children as VNode[])[0]
    return child
      ? getFragmentHostNode(api, child)
      : api.createComment(constant.EMPTY_STRING)
  }
  return vnode.node as Node
}

function insertNodeNatively(api: DomApi, parentNode: Node, node: Node, referenceNode: Node | void) {
  if (referenceNode) {
    api.before(parentNode, node, referenceNode)
  }
  else {
    api.append(parentNode, node)
  }
}

function textVNodeUpdateOperator(api: DomApi, vnode: VNode, oldVNode: VNode) {
  const node = oldVNode.node as Node
  vnode.node = node
  vnode.parentNode = oldVNode.parentNode
  if (vnode.text !== oldVNode.text) {
    api.setText(node, vnode.text as string, vnode.isStyle, vnode.isOption)
  }
}

function elementVNodeEnterOperator(vnode: VNode) {
  if (vnode.data) {
    enterVNode(vnode, vnode.node as Node)
  }
}

function elementVNodeLeaveOperator(vnode: VNode, done: Function) {
  if (vnode.data
    && leaveVNode(vnode, vnode.node as Node, done)
  ) {
    return
  }
  done()
}

function vnodeInsertOperator(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {
  // 这里不调用 insertNodeNatively，避免判断两次
  if (before) {
    api.before(parentNode, vnode.node as Node, before.node as Node)
  }
  else {
    api.append(parentNode, vnode.node as Node)
  }
}

function vnodeRemoveOperator(api: DomApi, vnode: VNode) {
  api.remove(vnode.parentNode as Node, vnode.node as Node)
}

function vnodeLeaveOperator(vnode: VNode, done: Function) {
  done()
}

function vnodeCreateChildrenOperator(api: DomApi, vnode: VNode) {

  const children = vnode.children as VNode[]

  for (let i = 0, length = children.length; i < length; i++) {
    createVNode(api, children[i])
  }

}

function vnodeUpdateChildrenOperator(api: DomApi, parentNode: Node, vnode: VNode, oldVNode: VNode) {

  updateChildren(
    api,
    parentNode,
    vnode.children as VNode[],
    oldVNode.children as VNode[]
  )

}

function vnodeDestroyChildrenOperator(api: DomApi, vnode: VNode) {

  const children = vnode.children as VNode[]

  for (let i = 0, length = children.length; i < length; i++) {
    destroyVNode(api, children[i])
  }

}

function vnodeInsertChildrenOperator(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {

  const children = vnode.children as VNode[]

  for (let i = 0, length = children.length; i < length; i++) {
    insertVNode(api, parentNode, children[i], before)
  }

}

function vnodeRemoveChildrenOperator(api: DomApi, vnode: VNode) {

  const children = vnode.children as VNode[]

  for (let i = 0, length = children.length; i < length; i++) {
    removeVNode(api, children[i])
  }

}

export const textVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {
    vnode.node = api.createText(vnode.text as string)
  },
  update: textVNodeUpdateOperator,
  destroy: constant.EMPTY_FUNCTION,
  insert: vnodeInsertOperator,
  remove: vnodeRemoveOperator,
  enter: constant.EMPTY_FUNCTION,
  leave: vnodeLeaveOperator,
}

export const commentVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {
    vnode.node = api.createComment(vnode.text as string)
  },
  update: textVNodeUpdateOperator,
  destroy: constant.EMPTY_FUNCTION,
  insert: vnodeInsertOperator,
  remove: vnodeRemoveOperator,
  enter: constant.EMPTY_FUNCTION,
  leave: vnodeLeaveOperator,
}

interface VNodeHooks {
  afterCreate?: (api: DomApi, vnode: VNode) => void | void
  afterMount?: (api: DomApi, vnode: VNode) => void | void
  beforeUpdate?: (api: DomApi, vnode: VNode, oldVNode: VNode) => void | void
  afterUpdate?: (api: DomApi, vnode: VNode, oldVNode: VNode) => void | void
  beforeDestroy?: (api: DomApi, vnode: VNode) => void | void
}

const vnodeHooksList: VNodeHooks[] = [
  nativeAttrHook,
  nativeStyleHook,
  refHook,
  eventHook,
  modelHook,
  directiveHook,
]
const vnodeHooksLength = vnodeHooksList.length

function callVNodeHooks(name: string, args: any[]) {
  for (let i = 0; i < vnodeHooksLength; i++) {
    const hook = vnodeHooksList[i][name]
    if (hook) {
      hook.apply(constant.UNDEFINED, args)
    }
  }
}

export const elementVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    const node = vnode.node = api.createElement(vnode.tag as string, vnode.isSvg)

    if (vnode.children) {
      addVNodes(api, node, vnode.children)
    }
    else if (vnode.text) {
      api.setText(node, vnode.text, vnode.isStyle, vnode.isOption)
    }
    else if (vnode.html) {
      api.setHtml(node, vnode.html, vnode.isStyle, vnode.isOption)
    }

    if (!vnode.isPure) {
      vnode.data = { }
    }

    callVNodeHooks('afterCreate', [api, vnode])

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const node = oldVNode.node as Node

    vnode.node = node
    vnode.parentNode = oldVNode.parentNode
    vnode.data = oldVNode.data

    callVNodeHooks('beforeUpdate', [api, vnode, oldVNode])

    const { text, html, children, isStyle, isOption } = vnode,

    oldText = oldVNode.text,
    oldHtml = oldVNode.html,
    oldChildren = oldVNode.children

    if (is.string(text)) {
      if (oldChildren) {
        removeVNodes(api, oldChildren)
      }
      if (text !== oldText) {
        api.setText(node, text as string, isStyle, isOption)
      }
    }
    else if (is.string(html)) {
      if (oldChildren) {
        removeVNodes(api, oldChildren)
      }
      if (html !== oldHtml) {
        api.setHtml(node as Element, html as string, isStyle, isOption)
      }
    }
    else if (children) {
      // 两个都有需要 diff
      if (oldChildren) {
        if (children !== oldChildren) {
          updateChildren(api, node, children, oldChildren)
        }
      }
      // 有新的没旧的 - 新增节点
      else {
        if (oldText || oldHtml) {
          api.setText(node, constant.EMPTY_STRING, isStyle)
        }
        addVNodes(api, node, children)
      }
    }
    // 有旧的没新的 - 删除节点
    else if (oldChildren) {
      removeVNodes(api, oldChildren)
    }
    // 有旧的 text 没有新的 text
    else if (oldText || oldHtml) {
      api.setText(node, constant.EMPTY_STRING, isStyle)
    }

    callVNodeHooks('afterUpdate', [api, vnode, oldVNode])

  },
  destroy(api: DomApi, vnode: VNode) {

    if (vnode.isPure) {
      return
    }

    callVNodeHooks('beforeDestroy', [api, vnode])

    const { children } = vnode
    if (children) {
      for (let i = 0, length = children.length; i < length; i++) {
        destroyVNode(api, children[i])
      }
    }

  },
  insert: vnodeInsertOperator,
  remove: vnodeRemoveOperator,
  enter: elementVNodeEnterOperator,
  leave: elementVNodeLeaveOperator,
}

export const componentVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    const data = vnode.data = { }

    let componentOptions: ComponentOptions | undefined = constant.UNDEFINED

    // 动态组件，tag 可能为空
    if (vnode.tag) {
      vnode.context.loadComponent(
        vnode.tag,
        function (options: ComponentOptions) {
          if (object.has(data, field.LOADING)) {
            // 异步组件
            if (data[field.LOADING]) {
              // 尝试使用最新的 vnode
              if (data[field.VNODE]) {
                vnode = data[field.VNODE]
                // 用完就删掉
                delete data[field.VNODE]
              }
              createComponent(api, vnode, options)
              vnode.operator.enter(vnode)
            }
          }
          // 同步组件
          else {
            componentOptions = options
          }
        }
      )
    }

    // 不论是同步还是异步组件，都需要一个占位元素
    vnode.node = api.createComment(constant.RAW_COMPONENT)

    if (componentOptions) {
      createComponent(api, vnode, componentOptions as ComponentOptions)
    }
    else {
      data[field.LOADING] = constant.TRUE
    }

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const data = oldVNode.data as Data

    vnode.data = data
    vnode.node = oldVNode.node
    vnode.parentNode = oldVNode.parentNode
    vnode.component = oldVNode.component

    // 组件正在异步加载，更新为最新的 vnode
    // 当异步加载完成时才能用上最新的 vnode
    if (data[field.LOADING]) {
      data[field.VNODE] = vnode
      return
    }

    callVNodeHooks('beforeUpdate', [api, vnode, oldVNode])

    const { component, slots } = vnode

    if (component) {
      let nextProps = vnode.props
      if (process.env.NODE_ENV === 'development') {
        if (nextProps) {
          for (let key in nextProps) {
            component.checkProp(key, nextProps[key])
          }
        }
      }
      if (slots) {
        nextProps = object.extend(nextProps || { }, slots)
      }
      if (nextProps) {
        component.forceUpdate(nextProps)
      }
    }

    callVNodeHooks('afterUpdate', [api, vnode, oldVNode])

  },
  destroy(api: DomApi, vnode: VNode) {

    const { component } = vnode
    if (component) {

      callVNodeHooks('beforeDestroy', [api, vnode])

      component.destroy()
      // 移除时，组件可能已经发生过变化，即 shadow 不是创建时那个对象了
      vnode.shadow = component.$vnode
      vnode.component = constant.UNDEFINED

    }
    else {
      (vnode.data as Data)[field.LOADING] = constant.FALSE
    }

  },
  insert(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {
    const { shadow } = vnode
    if (shadow) {
      shadow.operator.insert(api, parentNode, shadow, before)
      shadow.parentNode = parentNode
    }
    else {
      vnodeInsertOperator(api, parentNode, vnode, before)
    }
  },
  remove(api: DomApi, vnode: VNode) {
    const { shadow } = vnode
    if (shadow) {
      shadow.operator.remove(api, shadow)
      shadow.parentNode = constant.UNDEFINED
    }
    else {
      vnodeRemoveOperator(api, vnode)
    }
  },
  enter(vnode) {
    const { shadow } = vnode
    if (shadow) {
      if (vnode.transition) {
        enterVNode(vnode, shadow.node as Node)
      }
      else {
        shadow.operator.enter(shadow)
      }
    }
  },
  leave(vnode, done) {
    const { shadow } = vnode
    if (shadow) {
      if (vnode.transition) {
        if (leaveVNode(vnode, shadow.node as Node, done)) {
          return
        }
      }
      else {
        shadow.operator.leave(shadow, done)
        return
      }
    }
    done()
  },
}

export const fragmentVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    vnodeCreateChildrenOperator(api, vnode)

    vnode.node = getFragmentHostNode(api, vnode)

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const { parentNode } = oldVNode

    vnode.node = oldVNode.node
    vnode.parentNode = parentNode

    vnodeUpdateChildrenOperator(
      api,
      parentNode as Node,
      vnode,
      oldVNode
    )

  },
  destroy: vnodeDestroyChildrenOperator,
  insert: vnodeInsertChildrenOperator,
  remove: vnodeRemoveChildrenOperator,
  enter: constant.EMPTY_FUNCTION,
  leave: vnodeLeaveOperator,
}

export const portalVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    let target: Element | void = constant.UNDEFINED

    if (vnode.to) {
      target = api.find(vnode.to)
      if (process.env.NODE_ENV === 'development') {
        if (!target) {
          logger.fatal(`Failed to locate portal target with selector "${vnode.to}".`)
        }
      }
    }

    // 用 body 元素兜底
    if (!target) {
      target = api.getBodyElement()
    }

    vnode.target = target as Node

    // 用注释占用节点在模板里的位置
    // 这样删除或替换节点，才有找到它应该在的位置
    vnode.node = api.createComment(constant.EMPTY_STRING)

    const children = vnode.children as VNode[]

    for (let i = 0, length = children.length; i < length; i++) {
      createVNode(api, children[i])
      insertVNode(api, target as Node, children[i])
    }

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const { target } = oldVNode

    vnode.node = oldVNode.node
    vnode.parentNode = oldVNode.parentNode
    vnode.target = target

    vnodeUpdateChildrenOperator(api, target as Node, vnode, oldVNode)

  },
  destroy(api: DomApi, vnode: VNode) {

    const children = vnode.children as VNode[]

    for (let i = 0, length = children.length; i < length; i++) {
      destroyVNode(api, children[i])
      removeVNode(api, children[i])
    }

  },
  insert: vnodeInsertOperator,
  remove: vnodeRemoveOperator,
  enter: constant.EMPTY_FUNCTION,
  leave: vnodeLeaveOperator,
}

export const slotVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    vnodeCreateChildrenOperator(api, vnode)

    vnode.data = { }
    vnode.node = getFragmentHostNode(api, vnode)

    callVNodeHooks('afterCreate', [api, vnode])

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const { parentNode } = oldVNode

    vnode.node = oldVNode.node
    vnode.parentNode = parentNode
    vnode.data = oldVNode.data

    callVNodeHooks('beforeUpdate', [api, vnode, oldVNode])

    vnodeUpdateChildrenOperator(
      api,
      parentNode as Node,
      vnode,
      oldVNode
    )

    callVNodeHooks('afterUpdate', [api, vnode, oldVNode])

  },
  destroy(api: DomApi, vnode: VNode) {

    callVNodeHooks('beforeDestroy', [api, vnode])
    vnodeDestroyChildrenOperator(api, vnode)

  },
  insert: vnodeInsertChildrenOperator,
  remove: vnodeRemoveChildrenOperator,
  enter: elementVNodeEnterOperator,
  leave: elementVNodeLeaveOperator,
}


function isPatchable(vnode: VNode, oldVNode: VNode) {
  return vnode.type === oldVNode.type
    && vnode.tag === oldVNode.tag
    && vnode.key === oldVNode.key
}

function createKeyToIndex(vnodes: (VNode | void)[], startIndex: number, endIndex: number): Record<string, number> {

  let result: Record<string, number> | void,

  vnode: VNode | void,

  key: string | void

  while (startIndex <= endIndex) {
    vnode = vnodes[startIndex]
    if (vnode && (key = vnode.key)) {
      if (!result) {
        result = {}
      }
      result[key] = startIndex
    }
    startIndex++
  }

  return result || constant.EMPTY_OBJECT

}

function createComponent(api: DomApi, vnode: VNode, options: ComponentOptions) {

  const data = vnode.data as Data,

  child = (vnode.parent || vnode.context).createComponent(options, vnode)

  vnode.component = child
  vnode.shadow = child.$vnode

  data[field.LOADING] = constant.FALSE

  callVNodeHooks('afterCreate', [api, vnode])

  return child

}

function createVNode(api: DomApi, vnode: VNode) {
  if (!vnode.node) {
    vnode.operator.create(api, vnode)
  }
}

function addVNodes(api: DomApi, parentNode: Node, vnodes: VNode[], startIndex?: number, endIndex?: number, before?: VNode) {
  let vnode: VNode, start = startIndex || 0, end = endIndex !== constant.UNDEFINED ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    createVNode(api, vnode)
    insertVNode(api, parentNode, vnode, before)
    start++
  }
}

function insertVNode(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {

  const { operator } = vnode

  operator.insert(api, parentNode, vnode, before)
  vnode.parentNode = parentNode
  callVNodeHooks('afterMount', [api, vnode])

  operator.enter(vnode)

}

function removeVNodes(api: DomApi, vnodes: (VNode | void)[], startIndex?: number, endIndex?: number) {
  let vnode: VNode | void, start = startIndex || 0, end = endIndex !== constant.UNDEFINED ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    if (vnode) {
      destroyVNode(api, vnode)
      removeVNode(api, vnode)
    }
    start++
  }
}

function destroyVNode(api: DomApi, vnode: VNode) {
  vnode.operator.destroy(api, vnode)
}

function removeVNode(api: DomApi, vnode: VNode) {

  const { operator } = vnode

  operator.leave(
    vnode,
    function () {
      operator.remove(api, vnode)
      vnode.parentNode = constant.UNDEFINED
    }
  )

}

function enterVNode(vnode: VNode, node: Node) {

  const { context, transition } = vnode,

  data = vnode.data as Data,

  leaving = data[field.LEAVING]

  if (leaving) {
    leaving()
  }
  if (transition) {
    const { enter } = transition
    if (enter) {
      enter.call(
        context,
        node as HTMLElement
      )
    }
  }

}

function leaveVNode(vnode: VNode, node: Node, done: Function) {

  const { context, transition } = vnode,

  data = vnode.data as Data,

  leaving = data[field.LEAVING]

  if (leaving) {
    leaving()
  }
  if (transition) {
    const { leave } = transition
    if (leave) {
      leave.call(
        context,
        node as HTMLElement,
        data[field.LEAVING] = function () {
          if (data[field.LEAVING]) {
            done()
            data[field.LEAVING] = constant.UNDEFINED
          }
        }
      )
      return constant.TRUE
    }
  }

}

function updateChildren(api: DomApi, parentNode: Node, children: VNode[], oldChildren: (VNode | undefined)[]) {

  let startIndex = 0,
  endIndex = children.length - 1,
  startVNode = children[startIndex],
  endVNode = children[endIndex],

  oldStartIndex = 0,
  oldEndIndex = oldChildren.length - 1,
  oldStartVNode = oldChildren[oldStartIndex],
  oldEndVNode = oldChildren[oldEndIndex],

  oldKeyToIndex: Record<string, number> | void,
  oldIndex: number | void

  while (oldStartIndex <= oldEndIndex && startIndex <= endIndex) {

    // 下面有设为 UNDEFINED 的逻辑
    if (!startVNode) {
      startVNode = children[++startIndex];
    }
    else if (!endVNode) {
      endVNode = children[--endIndex];
    }
    else if (!oldStartVNode) {
      oldStartVNode = oldChildren[++oldStartIndex]
    }
    else if (!oldEndVNode) {
      oldEndVNode = oldChildren[--oldEndIndex]
    }

    // 从头到尾比较，位置相同且值得 patch
    else if (isPatchable(startVNode, oldStartVNode)) {
      updateVNode(api, startVNode, oldStartVNode)
      startVNode = children[++startIndex]
      oldStartVNode = oldChildren[++oldStartIndex]
    }

    // 从尾到头比较，位置相同且值得 patch
    else if (isPatchable(endVNode, oldEndVNode)) {
      updateVNode(api, endVNode, oldEndVNode)
      endVNode = children[--endIndex]
      oldEndVNode = oldChildren[--oldEndIndex]
    }

    // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

    // 当 endVNode 和 oldStartVNode 值得 patch
    // 说明元素被移到右边了
    else if (isPatchable(endVNode, oldStartVNode)) {
      updateVNode(api, endVNode, oldStartVNode)
      insertNodeNatively(
        api,
        parentNode,
        oldStartVNode.node as Node,
        api.next(oldEndVNode.node as Node)
      )
      endVNode = children[--endIndex]
      oldStartVNode = oldChildren[++oldStartIndex]
    }

    // 当 oldEndVNode 和 startVNode 值得 patch
    // 说明元素被移到左边了
    else if (isPatchable(startVNode, oldEndVNode)) {
      updateVNode(api, startVNode, oldEndVNode)
      insertNodeNatively(
        api,
        parentNode,
        oldEndVNode.node as Node,
        oldStartVNode.node as Node
      )
      startVNode = children[++startIndex]
      oldEndVNode = oldChildren[--oldEndIndex]
    }

    // 尝试同级元素的 key
    else {

      if (!oldKeyToIndex) {
        oldKeyToIndex = createKeyToIndex(oldChildren, oldStartIndex, oldEndIndex)
      }

      // 新节点之前的位置
      oldIndex = startVNode.key
        ? oldKeyToIndex[startVNode.key]
        : constant.UNDEFINED

      // 移动元素
      if (oldIndex !== constant.UNDEFINED) {
        patch(api, startVNode, oldChildren[oldIndex as number] as VNode)
        oldChildren[oldIndex as number] = constant.UNDEFINED
      }
      // 新元素
      else {
        createVNode(api, startVNode)
      }

      insertVNode(api, parentNode, startVNode, oldStartVNode)

      startVNode = children[++startIndex]

    }
  }

  if (oldStartIndex > oldEndIndex) {
    addVNodes(
      api,
      parentNode,
      children,
      startIndex,
      endIndex,
      children[endIndex + 1]
    )
  }
  else if (startIndex > endIndex) {
    removeVNodes(
      api,
      oldChildren,
      oldStartIndex,
      oldEndIndex
    )
  }
}

function updateVNode(api: DomApi, vnode: VNode, oldVNode: VNode) {
  if (vnode !== oldVNode) {
    vnode.operator.update(api, vnode, oldVNode)
  }
}

export function patch(api: DomApi, vnode: VNode, oldVNode: VNode) {

  if (vnode === oldVNode) {
    return
  }

  // 如果不能 patch，则删除重建
  if (!isPatchable(vnode, oldVNode)) {
    // 同步加载的组件，初始化时不会传入占位节点
    // 它内部会自动生成一个注释节点，当它的根 vnode 和注释节点对比时，必然无法 patch
    // 于是走进此分支，为新组件创建一个 DOM 节点，然后继续 createComponent 后面的流程
    const parentNode = oldVNode.parentNode
    createVNode(api, vnode)
    if (parentNode) {
      insertVNode(api, parentNode, vnode, oldVNode)
      destroyVNode(api, oldVNode)
      removeVNode(api, oldVNode)
    }
    return
  }

  updateVNode(api, vnode, oldVNode)

}

export function create(api: DomApi, node: Node, context: YoxInterface): VNode {
  const vnode: any = {
    context,
    node,
    parentNode: api.parent(node),
  }
  switch (node.nodeType) {
    case 1:
      vnode.data = { }
      vnode.tag = api.tag(node)
      vnode.type = VNODE_TYPE_ELEMENT
      vnode.operator = elementVNodeOperator
      break
    case 3:
      vnode.isPure = constant.TRUE
      vnode.text = node.nodeValue
      vnode.type = VNODE_TYPE_TEXT
      vnode.operator = textVNodeOperator
      break
    case 8:
      vnode.isPure = constant.TRUE
      vnode.text = node.nodeValue
      vnode.type = VNODE_TYPE_COMMENT
      vnode.operator = commentVNodeOperator
      break
  }
  return vnode
}

export function destroy(api: DomApi, vnode: VNode, isRemove?: boolean) {
  destroyVNode(api, vnode)
  if (isRemove) {
    removeVNode(api, vnode)
  }
}

export function clone(vnode: VNode): VNode {
  return {
    type: vnode.type,
    data: vnode.data,
    node: vnode.node,
    parentNode: vnode.parentNode,
    target: vnode.target,
    shadow: vnode.shadow,
    parent: vnode.parent,
    component: vnode.component,
    context: vnode.context,
    operator: vnode.operator,
    tag: vnode.tag,
    isComponent: vnode.isComponent,
    isSvg: vnode.isSvg,
    isStyle: vnode.isStyle,
    isOption: vnode.isOption,
    isStatic: vnode.isStatic,
    isPure: vnode.isPure,
    slots: vnode.slots,
    props: vnode.props,
    nativeAttrs: vnode.nativeAttrs,
    nativeStyles: vnode.nativeStyles,
    directives: vnode.directives,
    events: vnode.events,
    lazy: vnode.lazy,
    transition: vnode.transition,
    model: vnode.model,
    to: vnode.to,
    ref: vnode.ref,
    key: vnode.key,
    text: vnode.text,
    html: vnode.html,
    children: vnode.children
      ? vnode.children.map(clone)
      : vnode.children,
  }
}