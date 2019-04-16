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

const HOOK_CREATE = 'create'
const HOOK_UPDATE = 'update'
const HOOK_POSTPATCH = 'postpatch'
const HOOK_DESTROY = 'destroy'

function isPatchable(vnode1: VNode, vnode2: VNode) {
  return vnode1.key === vnode2.key
    && vnode1.tag === vnode2.tag
}

function createKeyToIndex(vnodes, startIndex, endIndex) {
  let result = { }, key
  while (startIndex <= endIndex) {
    key = vnodes[ startIndex ][ env.RAW_KEY ]
    if (isDef(key)) {
      result[ key ] = startIndex
    }
    startIndex++
  }
  return result
}

let guid = 0

export function init(api) {

  let createVnode = function (vnode: VNode) {

    let { tag, isComponent, isComment, isText, children, text, instance } = vnode

    let id = ++guid

    vnode.data = { id }

    if (isText) {
      return vnode.el = api.createText(text)
    }

    if (isComment) {
      return vnode.el = api.createComment(text)
    }

    // 不管是组件还是元素，必须先有一个元素
    let el = vnode.el = api.createElement(isComponent ? 'div' : tag)

    if (!isComponent) {

      if (is.array(children)) {
        addVnodes(el, children as VNode[], 0, children.length - 1)
      }
      else if (is.string(text)) {
        api.append(
          el,
          api.createText(text)
        )
      }

      moduleEmitter.fire(HOOK_CREATE, vnode, api)

    }


    api[ env.RAW_COMPONENT ](id, vnode)

    instance[ env.RAW_COMPONENT ](
      tag,
      function (options) {

        if (!options) {
          logger.fatal(`"${tag}" ${env.RAW_COMPONENT} is not found.`)
        }

        vnode = api[ env.RAW_COMPONENT ](id)

        if (vnode && tag === vnode[ env.RAW_TAG ]) {

          // 这里优先用 vnode.parent
          // 因为要实现正确的父子关系
          component = (vnode.parent || instance).create(options, vnode, el)

          el = component.$el
          if (!el) {
            logger.fatal(`"${tag}" ${env.RAW_COMPONENT} must have a root element.`)
          }

          vnode.el = el
          api[ env.RAW_COMPONENT ](id, component)

          enterVnode(vnode)

          moduleEmitter.fire(HOOK_CREATE, vnode, api)

        }

      }
    )

    return el

  },

  addVnodes = function (parentNode: Node, vnodes: VNode[], startIndex: number, endIndex: number, before?: VNode) {
    let vnode: VNode
    while (startIndex <= endIndex) {
      vnode = vnodes[startIndex]
      if (createVnode(vnode)) {
        insertVnode(parentNode, vnode, before)
      }
      startIndex++
    }
  },

  insertVnode = function (parentNode: Node, vnode: VNode, before?: VNode) {
    const hasParent = api.parent(vnode.el)
    api.before(parentNode, vnode.el, before ? before.el : env.NULL)
    if (!hasParent) {
      enterVnode(vnode)
    }
  },

  enterVnode = function (vnode: VNode) {
    let { el, hooks, instance } = vnode
    if (hooks) {
      if (data.leaving) {
        data.leaving()
      }
      execute(
        hooks.enter,
        instance,
        [el, env.EMPTY_FUNCTION]
      )
    }
  },

  removeVnodes = function (parentNode: Node, vnodes: VNode[], startIndex: number, endIndex: number) {
    let vnode: VNode
    while (startIndex <= endIndex) {
      vnode = vnodes[startIndex]
      if (vnode) {
        removeVnode(parentNode, vnode)
      }
      startIndex++
    }
  },

  removeVnode = function (parentNode: Node, vnode: VNode) {
    let el = vnode.el

    if (vnode[ env.RAW_TAG ]) {
      leaveVnode(
        vnode,
        function () {
          if (!destroyVnode(vnode)) {
            api.remove(parentNode, el)
          }
        }
      )
    }
    else if (el) {
      api.remove(parentNode, el)
    }
  },

  destroyVnode = function (vnode: VNode) {

    const { children, isComponent, isStatic } = vnode

    if (isComponent) {
      let { id } = vnode.data
      component = api[ env.RAW_COMPONENT ](id)
      if (vnode.parent === vnode.instance) {
        if (component.set) {
          moduleEmitter.fire(HOOK_DESTROY, vnode, api)
          api[ env.RAW_COMPONENT ](id, env.NULL)
          component.destroy()
          return env.TRUE
        }
        api[ env.RAW_COMPONENT ](id, env.NULL)
      }
      else {
        return
      }
    }
    else if (!isStatic && children) {
      array.each(
        children,
        function (child: VNode) {
          destroyVnode(child)
        }
      )
    }
    moduleEmitter.fire(HOOK_DESTROY, vnode, api)
  },


  leaveVnode = function (vnode: VNode, done: Function) {
    let { el, hooks, data, instance } = vnode
    if (hooks) {
      data.leaving = function () {
        if (done) {
          done()
          done = env.NULL
        }
      }
      execute(
        hooks.leave,
        instance,
        [ el, data.leaving ]
      )
    }
    else {
      done()
    }
  },

  updateChildren = function (parentNode: Node, oldChildren: VNode[], newChildren: VNode[]) {

    let oldStartIndex = 0
    let oldEndIndex = oldChildren[ env.RAW_LENGTH ] - 1
    let oldStartVnode = oldChildren[ oldStartIndex ]
    let oldEndVnode = oldChildren[ oldEndIndex ]

    let newStartIndex = 0
    let newEndIndex = newChildren[ env.RAW_LENGTH ] - 1
    let newStartVnode = newChildren[ newStartIndex ]
    let newEndVnode = newChildren[ newEndIndex ]

    let oldKeyToIndex, oldIndex, activeVnode

    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {

      // 下面有设为 NULL 的逻辑
      if (!oldStartVnode) {
        oldStartVnode = oldChildren[ ++oldStartIndex ] // Vnode has been moved left
      }
      else if (!oldEndVnode) {
        oldEndVnode = oldChildren[ --oldEndIndex ]
      }

      // 从头到尾比较，位置相同且值得 patch
      else if (isPatchable(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode)
        oldStartVnode = oldChildren[ ++oldStartIndex ]
        newStartVnode = newChildren[ ++newStartIndex ]
      }

      // 从尾到头比较，位置相同且值得 patch
      else if (isPatchable(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode)
        oldEndVnode = oldChildren[ --oldEndIndex ]
        newEndVnode = newChildren[ --newEndIndex ]
      }

      // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

      // 当 oldStartVnode 和 newEndVnode 值得 patch
      // 说明元素被移到右边了
      else if (isPatchable(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode)
        api.before(
          parentNode,
          oldStartVnode.el,
          api.next(oldEndVnode.el)
        )
        oldStartVnode = oldChildren[ ++oldStartIndex ]
        newEndVnode = newChildren[--newEndIndex ]
      }

      // 当 oldEndVnode 和 newStartVnode 值得 patch
      // 说明元素被移到左边了
      else if (isPatchable(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode)
        api.before(
          parentNode,
          oldEndVnode.el,
          oldStartVnode.el
        )
        oldEndVnode = oldChildren[ --oldEndIndex ]
        newStartVnode = newChildren[ ++newStartIndex ]
      }

      // 尝试同级元素的 key
      else {

        if (!oldKeyToIndex) {
          oldKeyToIndex = createKeyToIndex(oldChildren, oldStartIndex, oldEndIndex)
        }

        oldIndex = oldKeyToIndex[ newStartVnode[ env.RAW_KEY ] ]

        // 移动元素
        if (is.number(oldIndex)) {
          activeVnode = oldChildren[ oldIndex ]
          patchVnode(activeVnode, newStartVnode)
          oldChildren[ oldIndex ] = env.NULL
        }
        // 新元素
        else if (createVnode(newStartVnode)) {
          activeVnode = newStartVnode
        }

        if (activeVnode) {
          insertVnode(parentNode, activeVnode, oldStartVnode)
        }

        newStartVnode = newChildren[ ++newStartIndex ]

      }
    }

    if (oldStartIndex > oldEndIndex) {
      addVnodes(
        parentNode,
        newChildren,
        newStartIndex,
        newEndIndex,
        newChildren[ newEndIndex + 1 ]
      )
    }
    else if (newStartIndex > newEndIndex) {
      removeVnodes(
        parentNode,
        oldChildren,
        oldStartIndex,
        oldEndIndex
      )
    }
  },

  patchVnode = function (oldVnode: VNode, vnode: VNode) {

    if (oldVnode === vnode) {
      return
    }

    let { el, isComponent } = oldVnode

    vnode.el = el

    if (!isPatchable(oldVnode, vnode)) {
      let parentNode = api.parent(el)
      if (createVnode(vnode) && parentNode) {
        insertVnode(parentNode, vnode, oldVnode)
        removeVnode(parentNode, oldVnode)
      }
      return
    }

    if (component) {
      let { id } = vnode.data
      component = api[ env.RAW_COMPONENT ](id)
      if (!component.set) {
        api[ env.RAW_COMPONENT ](id, vnode)
        return;
      }
    }

    let args = [ vnode, oldVnode ]
    moduleEmitter.fire(HOOK_UPDATE, args, api)

    let newText = vnode[ env.RAW_TEXT ]
    let newChildren = vnode[ env.RAW_CHILDREN ]

    let oldText = oldVnode[ env.RAW_TEXT ]
    let oldChildren = oldVnode[ env.RAW_CHILDREN ]

    if (is.string(newText)) {
      if (newText !== oldText) {
        api[ env.RAW_TEXT ](el, newText)
      }
    }
    else {
      // 两个都有需要 diff
      if (newChildren && oldChildren) {
        if (newChildren !== oldChildren) {
          updateChildren(el, oldChildren, newChildren)
        }
      }
      // 有新的没旧的 - 新增节点
      else if (newChildren) {
        if (is.string(oldText)) {
          api[ env.RAW_TEXT ](el, env.EMPTY_STRING)
        }
        addVnodes(el, newChildren, 0, newChildren[ env.RAW_LENGTH ] - 1)
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        removeVnodes(el, oldChildren, 0, oldChildren[ env.RAW_LENGTH ] - 1)
      }
      // 有旧的 text 没有新的 text
      else if (is.string(oldText)) {
        api[ env.RAW_TEXT ](el, env.EMPTY_STRING)
      }
    }

    moduleEmitter.fire(HOOK_POSTPATCH, args, api)

  }

  return function (oldVnode: Node | VNode, vnode?: VNode) {

    patchVnode(
      api.isElement(oldVnode)
      ? {
          el: oldVnode,
          tag: api.tag(oldVnode),
        }
      : oldVnode,
      vnode
    )

    return vnode

  }
}
