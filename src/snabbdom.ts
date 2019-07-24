import {
  Data,
} from 'yox-type/src/type'

import {
  DomApi,
} from 'yox-type/src/api'

import {
  VNode,
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

import guid from 'yox-common/src/function/guid'
import execute from 'yox-common/src/function/execute'

import * as field from './field'

import * as nativeAttr from './nativeAttr'
import * as nativeProp from './nativeProp'
import * as directive from './directive'
import * as component from './component'

function isPatchable(vnode: VNode, oldVnode: VNode): boolean {
  return vnode.tag === oldVnode.tag
    && vnode.key === oldVnode.key
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

function insertBefore(api: DomApi, parentNode: Node, node: Node, referenceNode: Node | void) {
  if (referenceNode) {
    api.before(parentNode, node, referenceNode)
  }
  else {
    api.append(parentNode, node)
  }
}

function createComponent(vnode: VNode, options: ComponentOptions) {

  const child = (vnode.parent || vnode.context).createComponent(options, vnode)

  vnode.data[field.COMPONENT] = child
  vnode.data[field.LOADING] = constant.FALSE

  component.update(vnode)
  directive.update(vnode)

  return child

}

function createData(): Data {
  const data = {}
  data[field.ID] = guid()
  return data
}

function createVnode(api: DomApi, vnode: VNode) {

  let { tag, node, data, isComponent, isComment, isText, isStyle, isOption, children, text, html, context } = vnode

  if (node && data) {
    return
  }

  data = createData()

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

    let componentOptions: ComponentOptions | undefined = constant.UNDEFINED

    // 动态组件，tag 可能为空
    if (tag) {
      context.loadComponent(
        tag,
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
              enterVnode(
                vnode,
                createComponent(vnode, options)
              )
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
      createComponent(vnode, componentOptions as ComponentOptions)
    }
    else {
      data[field.LOADING] = constant.TRUE
    }

  }
  else {

    node = vnode.node = api.createElement(vnode.tag as string, vnode.isSvg)

    if (children) {
      addVnodes(api, node, children)
    }
    else if (text) {
      api.text(node as Element, text, isStyle, isOption)
    }
    else if (html) {
      api.html(node as Element, html, isStyle, isOption)
    }

    nativeAttr.update(api, vnode)
    nativeProp.update(api, vnode)
    component.update(vnode)
    directive.update(vnode)

  }
}

function addVnodes(api: DomApi, parentNode: Node, vnodes: VNode[], startIndex?: number, endIndex?: number, before?: VNode) {
  let vnode: VNode, start = startIndex || 0, end = endIndex !== constant.UNDEFINED ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    createVnode(api, vnode)
    insertVnode(api, parentNode, vnode, before)
    start++
  }
}

function insertVnode(api: DomApi, parentNode: Node, vnode: VNode, before?: VNode) {

  const { node, data, context } = vnode,

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
    let enter: Function | void = constant.UNDEFINED
    if (vnode.isComponent) {
      const component = data[field.COMPONENT]
      if (component) {
        enter = function () {
          enterVnode(vnode, component)
        }
      }
    }
    else if (!vnode.isStatic && !vnode.isText && !vnode.isComment) {
      enter = function () {
        enterVnode(vnode)
      }
    }
    if (enter) {
      // 执行到这时，组件还没有挂载到 DOM 树
      // 如果此时直接触发 enter，外部还需要做多余的工作，比如 setTimeout
      // 索性这里直接等挂载到 DOM 数之后再触发
      // 注意：YoxInterface 没有声明 $observer，因为不想让外部访问，
      // 但是这里要用一次，所以加了 as any
      (context as any).$observer.nextTask.prepend(enter)
    }
  }

}

function removeVnodes(api: DomApi, parentNode: Node, vnodes: (VNode | void)[], startIndex?: number, endIndex?: number) {
  let vnode: VNode | void, start = startIndex || 0, end = endIndex !== constant.UNDEFINED ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    if (vnode) {
      removeVnode(api, parentNode, vnode)
    }
    start++
  }
}

function removeVnode(api: DomApi, parentNode: Node, vnode: VNode) {
  const { node } = vnode
  if (vnode.isStatic || vnode.isText || vnode.isComment) {
    api.remove(parentNode, node)
  }
  else {

    let done = function () {
      destroyVnode(api, vnode)
      api.remove(parentNode, node)
    },

    component: YoxInterface | void

    if (vnode.isComponent) {
      component = vnode.data[field.COMPONENT]
      // 异步组件，还没加载成功就被删除了
      if (!component) {
        done()
        return
      }
    }

    leaveVnode(vnode, component, done)

  }
}

function destroyVnode(api: DomApi, vnode: VNode) {

  /**
   * 如果一个子组件的模板是这样写的：
   *
   * <div>
   *   {{#if visible}}
   *      <slot name="children"/>
   *   {{/if}}
   * </div>
   *
   * 当 visible 从 true 变为 false 时，不能销毁 slot 导入的任何 vnode
   * 不论是组件或是元素，都不能销毁，只能简单的 remove，
   * 否则子组件下一次展现它们时，会出问题
   */

  const { data, children, parent, slot } = vnode

  // 销毁插槽组件

  // 如果宿主组件正在销毁，$vnode 属性会在调 destroy() 之前被删除
  // 这里表示的是宿主组件还没被销毁
  // 如果宿主组件被销毁了，则它的一切都要进行销毁
  if (slot && parent && parent.$vnode) {
    // 如果更新时，父组件没有传入该 slot，则子组件需要销毁该 slot
    const slots = parent.get(slot)
    // slots 要么没有，要么是数组，不可能是别的
    if (slots && array.has(slots, vnode)) {
      return
    }
  }

  if (vnode.isComponent) {
    const component = data[field.COMPONENT]
    if (component) {
      directive.remove(vnode)
      component.destroy()
    }
    else [
      data[field.LOADING] = constant.FALSE
    ]
  }
  else {
    directive.remove(vnode)
    if (children) {
      array.each(
        children,
        function (child) {
          destroyVnode(api, child)
        }
      )
    }
  }

}

/**
 * vnode 触发 enter hook 时，外部一般会做一些淡入动画
 */
function enterVnode(vnode: VNode, component: YoxInterface | void) {
  // 如果组件根元素和组件本身都写了 transition
  // 优先用外面定义的
  // 因为这明确是在覆盖配置
  let { data, transition } = vnode
  if (component && !transition) {
    // 再看组件根元素是否有 transition
    transition = (component.$vnode as VNode).transition
  }
  execute(data[field.LEAVING])
  if (transition) {
    const { enter } = transition
    if (enter) {
      enter(
        vnode.node as HTMLElement
      )
      return
    }
  }
}

/**
 * vnode 触发 leave hook 时，外部一般会做一些淡出动画
 * 动画结束后才能移除节点，否则无法产生动画
 * 这里由外部调用 done 来通知内部动画结束
 */
function leaveVnode(vnode: VNode, component: YoxInterface | void, done: () => void) {
  // 如果组件根元素和组件本身都写了 transition
  // 优先用外面定义的
  // 因为这明确是在覆盖配置
  let { data, transition } = vnode
  if (component && !transition) {
    // 再看组件根元素是否有 transition
    transition = (component.$vnode as VNode).transition
  }
  if (transition) {
    const { leave } = transition
    if (leave) {
      leave(
        vnode.node as HTMLElement,
        data[field.LEAVING] = function () {
          if (data[field.LEAVING]) {
            done()
            data[field.LEAVING] = constant.UNDEFINED
          }
        }
      )
      return
    }
  }
  // 如果没有淡出动画，直接结束
  done()
}

function updateChildren(api: DomApi, parentNode: Node, children: VNode[], oldChildren: (VNode | void)[]) {

  let startIndex = 0,
  endIndex = children.length - 1,
  startVnode = children[startIndex],
  endVnode = children[endIndex],

  oldStartIndex = 0,
  oldEndIndex = oldChildren.length - 1,
  oldStartVnode = oldChildren[oldStartIndex],
  oldEndVnode = oldChildren[oldEndIndex],

  oldKeyToIndex: Record<string, number> | void,
  oldIndex: number | void

  while (oldStartIndex <= oldEndIndex && startIndex <= endIndex) {

    // 下面有设为 UNDEFINED 的逻辑
    if (!startVnode) {
      startVnode = children[++startIndex];
    }
    else if (!endVnode) {
      endVnode = children[--endIndex];
    }
    else if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex]
    }
    else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 从头到尾比较，位置相同且值得 patch
    else if (isPatchable(startVnode, oldStartVnode)) {
      patch(api, startVnode, oldStartVnode)
      startVnode = children[++startIndex]
      oldStartVnode = oldChildren[++oldStartIndex]
    }

    // 从尾到头比较，位置相同且值得 patch
    else if (isPatchable(endVnode, oldEndVnode)) {
      patch(api, endVnode, oldEndVnode)
      endVnode = children[--endIndex]
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

    // 当 endVnode 和 oldStartVnode 值得 patch
    // 说明元素被移到右边了
    else if (isPatchable(endVnode, oldStartVnode)) {
      patch(api, endVnode, oldStartVnode)
      insertBefore(
        api,
        parentNode,
        oldStartVnode.node,
        api.next(oldEndVnode.node)
      )
      endVnode = children[--endIndex]
      oldStartVnode = oldChildren[++oldStartIndex]
    }

    // 当 oldEndVnode 和 startVnode 值得 patch
    // 说明元素被移到左边了
    else if (isPatchable(startVnode, oldEndVnode)) {
      patch(api, startVnode, oldEndVnode)
      insertBefore(
        api,
        parentNode,
        oldEndVnode.node,
        oldStartVnode.node
      )
      startVnode = children[++startIndex]
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 尝试同级元素的 key
    else {

      if (!oldKeyToIndex) {
        oldKeyToIndex = createKeyToIndex(oldChildren, oldStartIndex, oldEndIndex)
      }

      // 新节点之前的位置
      oldIndex = startVnode.key
        ? oldKeyToIndex[startVnode.key]
        : constant.UNDEFINED

      // 移动元素
      if (oldIndex !== constant.UNDEFINED) {
        patch(api, startVnode, oldChildren[oldIndex as number] as VNode)
        oldChildren[oldIndex as number] = constant.UNDEFINED
      }
      // 新元素
      else {
        createVnode(api, startVnode)
      }

      insertVnode(api, parentNode, startVnode, oldStartVnode)

      startVnode = children[++startIndex]

    }
  }

  if (oldStartIndex > oldEndIndex) {
    addVnodes(
      api,
      parentNode,
      children,
      startIndex,
      endIndex,
      children[endIndex + 1]
    )
  }
  else if (startIndex > endIndex) {
    removeVnodes(
      api,
      parentNode,
      oldChildren,
      oldStartIndex,
      oldEndIndex
    )
  }
}

export function patch(api: DomApi, vnode: VNode, oldVnode: VNode) {

  if (vnode === oldVnode) {
    return
  }

  const { node, data } = oldVnode

  // 如果不能 patch，则删除重建
  if (!isPatchable(vnode, oldVnode)) {
    // 同步加载的组件，初始化时不会传入占位节点
    // 它内部会自动生成一个注释节点，当它的根 vnode 和注释节点对比时，必然无法 patch
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

  // 组件正在异步加载，更新为最新的 vnode
  // 当异步加载完成时才能用上最新的 vnode
  if (oldVnode.isComponent && data[field.LOADING]) {
    data[field.VNODE] = vnode
    return
  }

  nativeAttr.update(api, vnode, oldVnode)
  nativeProp.update(api, vnode, oldVnode)
  component.update(vnode, oldVnode)
  directive.update(vnode, oldVnode)

  const { text, html, children, isStyle, isOption } = vnode,

  oldText = oldVnode.text,
  oldHtml = oldVnode.html,
  oldChildren = oldVnode.children

  if (is.string(text)) {
    if (text !== oldText) {
      api.text(node, text, isStyle, isOption)
    }
  }
  else if (is.string(html)) {
    if (html !== oldHtml) {
      api.html(node as Element, html, isStyle, isOption)
    }
  }
  // 两个都有需要 diff
  else if (children && oldChildren) {
    if (children !== oldChildren) {
      updateChildren(api, node, children, oldChildren)
    }
  }
  // 有新的没旧的 - 新增节点
  else if (children) {
    if (is.string(oldText) || is.string(oldHtml)) {
      api.text(node, constant.EMPTY_STRING, isStyle)
    }
    addVnodes(api, node, children)
  }
  // 有旧的没新的 - 删除节点
  else if (oldChildren) {
    removeVnodes(api, node, oldChildren)
  }
  // 有旧的 text 没有新的 text
  else if (is.string(oldText) || is.string(oldHtml)) {
    api.text(node, constant.EMPTY_STRING, isStyle)
  }

}

export function create(api: DomApi, node: Node, context: YoxInterface, keypath: string): VNode {
  return {
    tag: api.tag(node),
    data: createData(),
    node,
    context,
    keypath,
  }
}

export function destroy(api: DomApi, vnode: VNode, isRemove?: boolean) {
  if (isRemove) {
    const parentNode = api.parent(vnode.node)
    if (parentNode) {
      removeVnode(api, parentNode, vnode)
    }
    else if (process.env.NODE_ENV === 'development') {
      logger.fatal(`The vnode can't be destroyed without a parent node.`)
    }
  }
  else {
    destroyVnode(api, vnode)
  }
}
