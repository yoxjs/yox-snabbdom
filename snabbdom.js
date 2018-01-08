
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'
import * as string from 'yox-common/util/string'

import Emitter from 'yox-common/util/Emitter'

import isDef from 'yox-common/function/isDef'
import execute from 'yox-common/function/execute'
import toString from 'yox-common/function/toString'

import attrs from './modules/attrs'
import props from './modules/props'
import directives from './modules/directives'
import component from './modules/component'

const TAG_COMMENT = '!'

const HOOK_CREATE = 'create'
const HOOK_UPDATE = 'update'
const HOOK_POSTPATCH = 'postpatch'
const HOOK_DESTROY = 'destroy'

let modules = [
  component, attrs, props, directives
]

const moduleEmitter = new Emitter()

array.each(
  [ HOOK_CREATE, HOOK_UPDATE, HOOK_POSTPATCH, HOOK_DESTROY ],
  function (hook) {
    array.each(
      modules,
      function (item) {
        moduleEmitter.on(hook, item[ hook ])
      }
    )
  }
)

modules = env.NULL

function isPatchable(vnode1, vnode2) {
  return vnode1.key === vnode2.key
    && vnode1.tag === vnode2.tag
}

function createKeyToIndex(vnodes, startIndex, endIndex) {
  let result = { }, key
  while (startIndex <= endIndex) {
    key = vnodes[ startIndex ].key
    if (isDef(key)) {
      result[ key ] = startIndex
    }
    startIndex++
  }
  return result
}

export function createCommentVnode(text) {
  return {
    tag: TAG_COMMENT,
    text: toString(text),
  }
}

export function createTextVnode(text) {
  return {
    text: toString(text),
  }
}

export function isTextVnode(vnode) {
  return vnode
    && object.has(vnode, 'text')
    && !object.has(vnode, 'tag')
}

export function createElementVnode(tag, attrs, props, directives, children, key, ref, instance) {
  return {
    tag,
    attrs,
    props,
    directives,
    children,
    key,
    ref,
    instance,
    text: env.UNDEFINED,
  }
}

export function createComponentVnode(tag, attrs, props, directives, children, key, ref, instance) {
  let vnode = createElementVnode(tag, attrs, props, directives, children, key, ref, instance)
  vnode.component = env.TRUE
  return vnode
}

export function init(api) {

  let createElement = function (parentNode, vnode) {

    let { el, tag, children, text } = vnode

    if (string.falsy(tag)) {
      return vnode.el = api.createText(text)
    }

    if (tag === TAG_COMMENT) {
      return vnode.el = api.createComment(text)
    }

    el = vnode.el = api.createElement(tag, parentNode)

    if (is.array(children)) {
      addVnodes(el, children, 0, children.length - 1)
    }
    else if (is.string(text)) {
      api.append(
        el,
        api.createText(text)
      )
    }

    moduleEmitter.fire(HOOK_CREATE, vnode, api)

    // 钩子函数可能会替换元素
    return vnode.el
  }

  let addVnodes = function (parentNode, vnodes, startIndex, endIndex, before) {
    while (startIndex <= endIndex) {
      addVnode(parentNode, vnodes[ startIndex ], before)
      startIndex++
    }
  }

  let addVnode = function (parentNode, vnode, before) {
    let el = createElement(parentNode, vnode)
    if (el) {
      api.before(parentNode, el, before)
    }
  }

  let removeVnodes = function (parentNode, vnodes, startIndex, endIndex) {
    let vnode
    while (startIndex <= endIndex) {
      vnode = vnodes[ startIndex ]
      if (vnode) {
        removeVnode(parentNode, vnode)
      }
      startIndex++
    }
  }

  let removeVnode = function (parentNode, vnode) {
    let { tag, el, component } = vnode
    if (tag) {
      destroyVnode(vnode)
      if (!component) {
        api.remove(parentNode, el)
      }
    }
    else if (el) {
      api.remove(parentNode, el)
    }
  }

  let destroyVnode = function (vnode) {
    let { children } = vnode
    if (children) {
      array.each(
        children,
        function (child) {
          destroyVnode(child)
        }
      )
    }
    moduleEmitter.fire(HOOK_DESTROY, vnode, api)
  }

  let replaceVnode = function (parentNode, oldVnode, vnode) {
    api.before(
      parentNode,
      vnode.el,
      oldVnode.el
    )
    removeVnode(parentNode, oldVnode)
  }

  let updateChildren = function (parentNode, oldChildren, newChildren) {

    let oldStartIndex = 0
    let oldEndIndex = oldChildren.length - 1
    let oldStartVnode = oldChildren[ oldStartIndex ]
    let oldEndVnode = oldChildren[ oldEndIndex ]

    let newStartIndex = 0
    let newEndIndex = newChildren.length - 1
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

        oldIndex = oldKeyToIndex[ newStartVnode.key ]

        // 移动元素
        if (is.number(oldIndex)) {
          activeVnode = oldChildren[ oldIndex ]
          patchVnode(activeVnode, newStartVnode)
          oldChildren[ oldIndex ] = env.NULL
        }
        // 新元素
        else {
          activeVnode = createElement(parentNode, newStartVnode)
          if (activeVnode) {
            activeVnode = newStartVnode
          }
        }

        if (activeVnode) {
          api.before(
            parentNode,
            activeVnode.el,
            oldStartVnode.el
          )
        }

        newStartVnode = newChildren[ ++newStartIndex ]

      }
    }

    if (oldStartIndex > oldEndIndex) {
      activeVnode = newChildren[ newEndIndex + 1 ]
      addVnodes(
        parentNode,
        newChildren,
        newStartIndex,
        newEndIndex,
        activeVnode ? activeVnode.el : env.NULL
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
  }

  let patchVnode = function (oldVnode, vnode) {

    if (oldVnode === vnode) {
      return
    }

    let { el } = oldVnode
    vnode.el = el

    if (!isPatchable(oldVnode, vnode)) {
      let parentNode = api.parent(el)
      if (createElement(parentNode, vnode)) {
        parentNode && replaceVnode(parentNode, oldVnode, vnode)
      }
      return
    }

    let args = [ vnode, oldVnode ]
    moduleEmitter.fire(HOOK_UPDATE, args, api)

    let newText = vnode.text
    let newChildren = vnode.children

    let oldText = oldVnode.text
    let oldChildren = oldVnode.children

    if (is.string(newText)) {
      if (newText !== oldText) {
        api.text(el, newText)
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
          api.text(el, char.CHAR_BLANK)
        }
        addVnodes(el, newChildren, 0, newChildren.length - 1)
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        removeVnodes(el, oldChildren, 0, oldChildren.length - 1)
      }
      // 有旧的 text 没有新的 text
      else if (is.string(oldText)) {
        api.text(el, char.CHAR_BLANK)
      }
    }

    moduleEmitter.fire(HOOK_POSTPATCH, args, api)

  }

  return function (oldVnode, vnode) {

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
