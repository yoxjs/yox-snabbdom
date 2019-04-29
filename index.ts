import * as is from 'yox-common/src/util/is'
import * as env from 'yox-common/src/util/env'
import * as array from 'yox-common/src/util/array'
import * as logger from 'yox-common/src/util/logger'

import isDef from 'yox-common/src/function/isDef'
import execute from 'yox-common/src/function/execute'

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

  return result || env.EMPTY_OBJECT

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
    if (process.env.NODE_ENV === 'dev') {
      logger.fatal(`component [${vnode.tag}] is not found.`)
    }
    return
  }

  // 渲染同步加载的组件时，vnode.node 为空
  // 渲染异步加载的组件时，vnode.node 不为空，因为初始化用了占位节点
  const child = (vnode.parent || vnode.context).create(options, vnode, vnode.node),

  // 组件初始化创建的元素
  node = child.$el as Node

  if (node) {
    vnode[NODE] = node
  }
  else if (process.env.NODE_ENV === 'dev') {
    logger.fatal(`the root element of component [${vnode.tag}] is not found.`)
  }

  vnode.data[field.COMPONENT] = child
  vnode.data[field.LOADING] = env.FALSE

  component.update(vnode)
  directive.update(vnode)

  return child

}

let guid = 0,

// vnode.node 设置成了 readonly，是为了避免外部修改
// 但是这里还是要对 vnode.node 进行赋值，只好用变量属性赋值，跳过 ts 的类型检测
NODE = 'node'

function createData(): Record<string, any> {
  const data = {}
  data[field.ID] = ++guid
  return data
}

function createVnode(api: API, vnode: VNode) {

  let { tag, node, data, isComponent, isComment, isText, isStyle, children, text, html, context } = vnode

  if (node && data) {
    return
  }

  data = createData()

  vnode.data = data

  if (isText) {
    vnode[NODE] = api.createText(text as string)
    return
  }

  if (isComment) {
    vnode[NODE] = api.createComment(text as string)
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
      vnode[NODE] = api.createComment(env.RAW_COMPONENT)
      data[field.LOADING] = env.TRUE
    }

  }
  else {

    node = vnode[NODE] = api.createElement(vnode.tag as string, vnode.isSvg)

    if (children) {
      addVnodes(api, node, children)
    }
    else if (text) {
      api.text(node as Element, text, isStyle)
    }
    else if (html) {
      api.html(node as Element, html, isStyle)
    }

    nativeAttr.update(api, vnode)
    nativeProp.update(api, vnode)
    component.update(vnode)
    directive.update(vnode)

  }
}

function addVnodes(api: API, parentNode: Node, vnodes: VNode[], startIndex?: number, endIndex?: number, before?: VNode) {
  let vnode: VNode, start = startIndex || 0, end = isDef(endIndex) ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    createVnode(api, vnode)
    insertVnode(api, parentNode, vnode, before)
    start++
  }
}

function insertVnode(api: API, parentNode: Node, vnode: VNode, before?: VNode) {

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
    let enter: Function | void
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
      context.nextTick(enter, env.TRUE)
    }
  }

}

function removeVnodes(api: API, parentNode: Node, vnodes: (VNode | void)[], startIndex?: number, endIndex?: number) {
  let vnode: VNode | void, start = startIndex || 0, end = isDef(endIndex) ? endIndex as number : vnodes.length - 1
  while (start <= end) {
    vnode = vnodes[start]
    if (vnode) {
      removeVnode(api, parentNode, vnode)
    }
    start++
  }
}

function removeVnode(api: API, parentNode: Node, vnode: VNode) {
  const { node } = vnode
  if (vnode.isStatic || vnode.isText || vnode.isComment) {
    api.remove(parentNode, node)
  }
  else {

    let done = function () {
      destroyVnode(api, vnode)
      api.remove(parentNode, node)
    },

    component: Yox | void

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

function destroyVnode(api: API, vnode: VNode) {

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

  const { data, children, parent, context } = vnode

  if (parent
    // 如果宿主组件正在销毁，$vnode 属性会在调 destroy() 之前被删除
    // 这里表示的是宿主组件还没被销毁
    // 如果宿主组件被销毁了，则它的一切都要进行销毁
    && parent.$vnode
    // 是从外部传入到组件内的
    && parent !== vnode.context
  ) {
    return
  }

  if (vnode.isComponent) {
    const component = data[field.COMPONENT]
    if (component) {
      directive.remove(vnode)
      component.destroy()
    }
    else [
      data[field.LOADING] = env.FALSE
    ]
  }
  else {
    directive.remove(vnode)
    if (children) {
      array.each(
        children,
        function (child: VNode) {
          destroyVnode(api, child)
        }
      )
    }
  }

}

/**
 * vnode 触发 enter hook 时，外部一般会做一些淡入动画
 */
function enterVnode(vnode: VNode, component: Yox | void) {
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
        vnode.node as HTMLElement,
        env.EMPTY_FUNCTION
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
function leaveVnode(vnode: VNode, component: Yox | void, done: () => void) {
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
            data[field.LEAVING] = env.UNDEFINED
          }
        }
      )
      return
    }
  }
  // 如果没有淡出动画，直接结束
  done()
}

function updateChildren(api: API, parentNode: Node, children: VNode[], oldChildren: (VNode | void)[]) {

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
        : env.UNDEFINED

      // 移动元素
      if (isDef(oldIndex)) {
        patch(api, startVnode, oldChildren[oldIndex as number] as VNode)
        oldChildren[oldIndex as number] = env.UNDEFINED
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

export function patch(api: API, vnode: VNode, oldVnode: VNode) {

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

  vnode[NODE] = node
  vnode.data = data

  // 组件正在异步加载，更新为最新的 vnode
  // 当异步加载完成时才能用上最新的 vnode
  if (oldVnode.isComponent && data[field.LOADING]) {
    data[field.VNODE] = vnode
    return
  }

  // 两棵静态子树就别折腾了
  if (vnode.isStatic && oldVnode.isStatic) {
    return
  }

  nativeAttr.update(api, vnode, oldVnode)
  nativeProp.update(api, vnode, oldVnode)
  component.update(vnode, oldVnode)
  directive.update(vnode, oldVnode)

  const { text, html, children, isStyle } = vnode,

  oldText = oldVnode.text,
  oldHtml = oldVnode.html,
  oldChildren = oldVnode.children

  if (is.string(text)) {
    if (text !== oldText) {
      api.text(node, text, isStyle)
    }
  }
  else if (is.string(html)) {
    if (html !== oldHtml) {
      api.html(node as Element, html, isStyle)
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
      api.text(node, env.EMPTY_STRING, isStyle)
    }
    addVnodes(api, node, children)
  }
  // 有旧的没新的 - 删除节点
  else if (oldChildren) {
    removeVnodes(api, node, oldChildren)
  }
  // 有旧的 text 没有新的 text
  else if (is.string(oldText) || is.string(oldHtml)) {
    api.text(node, env.EMPTY_STRING, isStyle)
  }

}

export function create(api: API, node: Node, isComment: boolean, context: Yox, keypath: string): VNode {
  return {
    tag: api.tag(node),
    data: createData(),
    isComment,
    node,
    context,
    keypath,
  }
}

export function destroy(api: API, vnode: VNode, isRemove?: boolean) {
  if (isRemove) {
    const parentNode = api.parent(vnode.node)
    if (parentNode) {
      removeVnode(api, parentNode, vnode)
    }
    else if (process.env.NODE_ENV === 'dev') {
      logger.fatal(`destroy vnode can't not work without parent node.`)
    }
  }
  else {
    destroyVnode(api, vnode)
  }
}
