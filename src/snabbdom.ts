import {
  VNODE_TYPE_TEXT,
  VNODE_TYPE_COMMENT,
  VNODE_TYPE_ELEMENT,
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
import * as array from 'yox-common/src/util/array'
import * as object from 'yox-common/src/util/object'
import * as logger from 'yox-common/src/util/logger'
import * as constant from 'yox-common/src/util/constant'

import * as field from './field'

import * as nativeAttr from './module/nativeAttr'
import * as nativeProp from './module/nativeProp'
import * as nativeStyle from './module/nativeStyle'
import * as ref from './module/ref'
import * as event from './module/event'
import * as model from './module/model'
import * as directive from './module/directive'
import * as component from './module/component'

function getFragmentHostNode(api: DomApi, vnode: VNode): Node {
  if (vnode.isFragment || vnode.isSlot) {
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

  array.each(
    vnode.children as VNode[],
    function (child) {
      createVNode(api, child)
    }
  )

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

  array.each(
    vnode.children as VNode[],
    function (child) {
      destroyVNode(api, child)
    }
  )

}

function vnodeInsertChildrenOperator(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {

  array.each(
    vnode.children as VNode[],
    function (child) {
      insertVNode(api, parentNode, child, before)
    }
  )

}

function vnodeRemoveChildrenOperator(api: DomApi, vnode: VNode) {

  array.each(
    vnode.children as VNode[],
    function (child) {
      removeVNode(api, child)
    }
  )

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

export const elementVNodeOperator: VNodeOperator = {
  create(api: DomApi, vnode: VNode) {

    const node = vnode.node = api.createElement(vnode.tag as string, vnode.isSvg)

    if (vnode.children) {
      addVNodes(api, node, vnode.children)
    }
    else if (vnode.text) {
      api.setText(node as Element, vnode.text, vnode.isStyle, vnode.isOption)
    }
    else if (vnode.html) {
      api.setHtml(node as Element, vnode.html, vnode.isStyle, vnode.isOption)
    }

    nativeAttr.update(api, vnode)
    nativeProp.update(api, vnode)
    nativeStyle.update(api, vnode)

    if (!vnode.isPure) {
      vnode.data = { }
      ref.update(api, vnode)
      event.update(api, vnode)
      model.update(api, vnode)
      directive.update(api, vnode)
    }

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const node = oldVNode.node as Node

    vnode.node = node
    vnode.parentNode = oldVNode.parentNode
    vnode.data = oldVNode.data

    nativeAttr.update(api, vnode, oldVNode)
    nativeProp.update(api, vnode, oldVNode)
    nativeStyle.update(api, vnode, oldVNode)

    if (!vnode.isPure) {
      ref.update(api, vnode, oldVNode)
      event.update(api, vnode, oldVNode)
      model.update(api, vnode, oldVNode)
      directive.update(api, vnode, oldVNode)
    }

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

  },
  destroy(api: DomApi, vnode: VNode) {

    if (vnode.isPure) {
      return
    }

    ref.remove(api, vnode)
    event.remove(api, vnode)
    model.remove(api, vnode)
    directive.remove(api, vnode)

    if (vnode.children) {
      array.each(
        vnode.children,
        function (child) {
          destroyVNode(api, child)
        }
      )
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

    // 先处理 directive 再处理 component
    // 因为组件只是单纯的更新 props，而 directive 则有可能要销毁
    // 如果顺序反过来，会导致某些本该销毁的指令先被数据的变化触发执行了
    ref.update(api, vnode, oldVNode)
    event.update(api, vnode, oldVNode)
    model.update(api, vnode, oldVNode)
    directive.update(api, vnode, oldVNode)

    component.update(api, vnode, oldVNode)

  },
  destroy(api: DomApi, vnode: VNode) {

    if (vnode.component) {
      ref.remove(api, vnode)
      event.remove(api, vnode)
      model.remove(api, vnode)
      directive.remove(api, vnode)
      component.remove(api, vnode)
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

    array.each(
      vnode.children as VNode[],
      function (child) {
        createVNode(api, child)
        insertVNode(api, target as Node, child)
      }
    )

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const { target } = oldVNode

    vnode.node = oldVNode.node
    vnode.parentNode = oldVNode.parentNode
    vnode.target = target

    vnodeUpdateChildrenOperator(api, target as Node, vnode, oldVNode)

  },
  destroy(api: DomApi, vnode: VNode) {

    array.each(
      vnode.children as VNode[],
      function (child) {
        destroyVNode(api, child)
        removeVNode(api, child)
      }
    )

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

    ref.update(api, vnode)
    event.update(api, vnode)

  },
  update(api: DomApi, vnode: VNode, oldVNode: VNode) {

    const { parentNode } = oldVNode

    vnode.node = oldVNode.node
    vnode.parentNode = parentNode
    vnode.data = oldVNode.data

    ref.update(api, vnode, oldVNode)
    event.update(api, vnode, oldVNode)

    vnodeUpdateChildrenOperator(
      api,
      parentNode as Node,
      vnode,
      oldVNode
    )

  },
  destroy(api: DomApi, vnode: VNode) {

    ref.remove(api, vnode)
    event.remove(api, vnode)

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

  ref.update(api, vnode)
  event.update(api, vnode)
  model.update(api, vnode)
  directive.update(api, vnode)
  component.update(api, vnode)

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

  const data = vnode.data as Data,

  transition = vnode.transition,

  leaving = data[field.LEAVING]

  if (leaving) {
    leaving()
  }
  if (transition) {
    const { enter } = transition
    if (enter) {
      (vnode.context as any).$nextTask.prepend(
        function () {
          enter.call(
            vnode.context,
            node as HTMLElement
          )
        }
      )
    }
  }

}

function leaveVNode(vnode: VNode, node: Node, done: Function) {

  const data = vnode.data as Data,

  transition = vnode.transition,

  leaving = data[field.LEAVING]

  if (leaving) {
    leaving()
  }
  if (transition) {
    const { leave } = transition
    if (leave) {
      leave.call(
        vnode.context,
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
    tag: vnode.tag,
    isComponent: vnode.isComponent,
    isFragment: vnode.isFragment,
    isSlot: vnode.isSlot,
    isSvg: vnode.isSvg,
    isStyle: vnode.isStyle,
    isOption: vnode.isOption,
    isStatic: vnode.isStatic,
    isPure: vnode.isPure,
    slots: vnode.slots,
    props: vnode.props,
    nativeProps: vnode.nativeProps,
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
    children: vnode.children,
    parent: vnode.parent,
    context: vnode.context,
    operator: vnode.operator,
  }
}
