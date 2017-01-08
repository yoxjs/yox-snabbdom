
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

import Emitter from 'yox-common/util/Emitter'

import Vnode from './Vnode'

import * as domApi from './htmldomapi'

const HOOK_INIT = 'init'
const HOOK_CREATE = 'create'
const HOOK_INSERT = 'insert'

const HOOK_REMOVE = 'remove'
const HOOK_DESTROY = 'destroy'

const HOOK_PRE = 'pre'
const HOOK_POST = 'post'

const HOOK_PREPATCH = 'prepatch'
const HOOK_UPDATE = 'update'
const HOOK_POSTPATCH = 'postpatch'

const moduleHooks = [ HOOK_CREATE, HOOK_UPDATE, HOOK_REMOVE, HOOK_DESTROY, HOOK_PRE, HOOK_POST ]

const whitespacePattern = /\s+/

const emptyNode = new Vnode({
  sel: char.CHAR_BLANK,
  data: { },
  children: [ ],
})

function isSameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key
    && vnode1.sel === vnode2.sel
}

function createKeyToIndex(vnodes, startIndex, endIndex) {
  let result = { }
  for (let i = startIndex, key; i <= endIndex; i++) {
    key = vnodes[i].key
    if (key != env.NULL) {
      result[key] = i
    }
  }
  return result
}

export function init(modules, api = domApi) {

  let hookEmitter = new Emitter(), result

  array.each(
    moduleHooks,
    function (hook) {
      array.each(
        modules,
        function (mod) {
          hookEmitter.on(hook, mod[hook])
        }
      )
    }
  )

  let stringifySel = function (el) {
    let terms = [
      api.tagName(el).toLowerCase()
    ]
    let { id, className } = el
    if (id) {
      array.push(terms, `${char.CHAR_HASH}${id}`)
    }
    if (className) {
      array.push(terms, `${char.CHAR_DOT}${className.split(whitespacePattern).join(char.CHAR_DOT)}`)
    }
    return terms.join(char.CHAR_BLANK)
  }

  let parseSel = function (sel) {

    let tagName, id, className

    let hashIndex = sel.indexOf(char.CHAR_HASH)
    if (hashIndex > 0) {
      tagName = sel.slice(0, hashIndex)
      sel = sel.slice(hashIndex + 1)
    }

    let dotIndex = sel.indexOf(char.CHAR_DOT)
    if (dotIndex > 0) {
      let temp = sel.slice(0, dotIndex)
      if (tagName) {
        id = temp
      }
      else {
        tagName = temp
      }
      className = sel.slice(dotIndex + 1).split(char.CHAR_DOT).join(' ')
    }
    else {
      if (tagName) {
        id = sel
      }
      else {
        tagName = sel
      }
    }

    return { tagName, id, className }

  }

  let createVnode = function (el) {
    return new Vnode({
      sel: stringifySel(el),
      data: { },
      children: [ ],
      el,
    })
  }

  let replaceVnode = function (parentEl, oldVnode, vnode) {
    if (parentEl) {
      api.insertBefore(
        parentEl,
        vnode.el,
        oldVnode.el
      )
      removeVnode(parentEl, oldVnode)
    }
  }

  let createElement = function (vnode, insertedQueue) {

    let hook = object.get(vnode, 'data.hook')
    hook = hook ? hook.value : { }

    if (hook[HOOK_INIT]) {
      hook[HOOK_INIT](vnode)
    }

    let { sel, children, text } = vnode
    if (is.string(sel)) {
      let { tagName, id, className } = parseSel(sel)
      let el = api.createElement(tagName)
      if (id) {
        el.id = id
      }
      if (className) {
        el.className = className
      }

      vnode.el = el

      if (is.array(children)) {
        addVnodes(el, children, 0, children.length - 1, insertedQueue)
      }
      else if (is.string(text)) {
        api.appendChild(
          el,
          api.createTextNode(text)
        )
      }

      hookEmitter.fire(HOOK_CREATE, [ emptyNode, vnode ])

      if (hook[HOOK_CREATE]) {
        hook.create(emptyNode, vnode)
      }
      if (hook[HOOK_INSERT]) {
        insertedQueue.push(vnode)
      }

      return el
    }
    else {
      return vnode.el = vnode.raw
        ? api.createFragment(text)
        : api.createTextNode(text)
    }
  }

  let addVnodes = function (parentEl, vnodes, startIndex, endIndex, insertedQueue, before) {
    for (let i = startIndex; i <= endIndex; i++) {
      addVnode(parentEl, vnodes[i], insertedQueue, before)
    }
  }

  let addVnode = function (parentEl, vnode, insertedQueue, before) {
    api.insertBefore(
      parentEl,
      createElement(vnode, insertedQueue),
      before
    )
  }

  let removeVnodes = function (parentEl, vnodes, startIndex, endIndex) {
    for (let i = startIndex; i <= endIndex; i++) {
      removeVnode(parentEl, vnodes[i])
    }
  }

  let removeVnode = function (parentEl, vnode) {
    let { sel, el } = vnode
    if (sel) {
      destroyVnode(vnode)
      api.removeChild(parentEl, el)
      hookEmitter.fire(HOOK_REMOVE, vnode)

      result = object.get(vnode, `data.hook.${HOOK_REMOVE}`)
      if (result) {
        result.value(vnode)
      }
    }
    else {
      api.removeChild(parentEl, el)
    }
  }

  let destroyVnode = function (vnode) {
    let { data, children } = vnode
    if (data) {

      // 先销毁 children
      if (children) {
        array.each(
          children,
          function (child) {
            destroyVnode(child)
          }
        )
      }

      result = object.get(data, `hook.${HOOK_DESTROY}`)
      if (result) {
        result.value(vnode)
      }

      hookEmitter.fire(HOOK_DESTROY, vnode)
    }
  }

  let updateChildren = function (parentEl, oldChildren, newChildren, insertedQueue) {

    let oldStartIndex = 0
    let oldEndIndex = oldChildren.length - 1
    let oldStartVnode = oldChildren[oldStartIndex]
    let oldEndVnode = oldChildren[oldEndIndex]

    let newStartIndex = 0
    let newEndIndex = newChildren.length - 1
    let newStartVnode = newChildren[newStartIndex]
    let newEndVnode = newChildren[newEndIndex]

    let oldKeyToIndex, oldIndex, activeVnode

    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {

      // 下面有设为 NULL 的逻辑
      if (!oldStartVnode) {
        oldStartVnode = oldChildren[ ++oldStartIndex ] // Vnode has been moved left
      }
      else if (!oldEndVnode) {
        oldEndVnode = oldChildren[ --oldEndIndex ]
      }

      // 优先从头到尾比较，位置相同且值得 patch
      else if (isSameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedQueue)
        oldStartVnode = oldChildren[ ++oldStartIndex ]
        newStartVnode = newChildren[ ++newStartIndex ]
      }

      // 再从尾到头比较，位置相同且值得 patch
      else if (isSameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedQueue)
        oldEndVnode = oldChildren[ --oldEndIndex ]
        newEndVnode = newChildren[ --newEndIndex ]
      }

      // 比较完两侧的节点，剩下就是 位置发生改变的节点 和 全新的节点

      // 当 oldStartVnode 和 newEndVnode 值得 patch
      // 说明元素被移到右边了
      else if (isSameVnode(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode, insertedQueue)
        api.insertBefore(
          parentEl,
          oldStartVnode.el,
          api.nextSibling(oldEndVnode.el)
        )
        oldStartVnode = oldChildren[++oldStartIndex]
        newEndVnode = newChildren[--newEndIndex]
      }

      // 当 oldEndVnode 和 newStartVnode 值得 patch
      // 说明元素被移到左边了
      else if (isSameVnode(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode, insertedQueue)
        api.insertBefore(
          parentEl,
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

        oldIndex = oldKeyToIndex[newStartVnode.key]

        // 移动元素
        if (is.number(oldIndex)) {
          activeVnode = oldChildren[oldIndex]
          patchVnode(activeVnode, newStartVnode, insertedQueue)
          oldChildren[oldIndex] = env.NULL
        }
        // 新元素
        else {
          createElement(newStartVnode, insertedQueue)
          activeVnode = newStartVnode
        }

        api.insertBefore(
          parentEl,
          activeVnode.el,
          oldStartVnode.el
        )
        newStartVnode = newChildren[ ++newStartIndex ]

      }
    }

    if (oldStartIndex > oldEndIndex) {
      activeVnode = newChildren[newEndIndex + 1]
      addVnodes(
        parentEl,
        newChildren,
        newStartIndex,
        newEndIndex,
        insertedQueue,
        activeVnode ? activeVnode.el : env.NULL
      )
    }
    else if (newStartIndex > newEndIndex) {
      removeVnodes(
        parentEl,
        oldChildren,
        oldStartIndex,
        oldEndIndex
      )
    }
  }

  let patchVnode = function (oldVnode, vnode, insertedQueue) {

    if (oldVnode === vnode) {
      return
    }

    let hook = object.get(vnode, 'data.hook')
    hook = hook ? hook.value : { }

    if (hook[HOOK_PREPATCH]) {
      hook[HOOK_PREPATCH](oldVnode, vnode)
    }

    let el = vnode.el = oldVnode.el
    if (!isSameVnode(oldVnode, vnode)) {
      createElement(vnode, insertedQueue)
      replaceVnode(
        api.parentNode(el),
        oldVnode,
        vnode,
      )
      return
    }

    if (vnode.data) {
      hookEmitter.fire(HOOK_UPDATE, [ oldVnode, vnode ])
    }

    if (hook[HOOK_UPDATE]) {
      hook[HOOK_UPDATE](oldVnode, vnode)
    }

    let newRaw = vnode.raw
    let newText = vnode.text
    let newChildren = vnode.children

    let oldRaw = oldVnode.raw
    let oldText = oldVnode.text
    let oldChildren = oldVnode.children

    if (is.string(newText)) {
      if (newText !== oldText) {
        if (newRaw) {
          api.replaceChild(
            api.parentNode(el),
            api.createFragment(newText),
            el
          )
        }
        else {
          api.setTextContent(el, newText)
        }
      }
    }
    else {
      // 两个都有需要 diff
      if (newChildren && oldChildren) {
        if (newChildren !== oldChildren) {
          updateChildren(el, oldChildren, newChildren, insertedQueue)
        }
      }
      // 有新的没旧的 - 新增节点
      else if (newChildren) {
        if (is.string(oldText)) {
          api[ oldRaw ? 'setHtmlContent' : 'setTextContent' ](el, char.CHAR_BLANK)
        }
        addVnodes(el, newChildren, 0, newChildren.length - 1, insertedQueue)
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        removeVnodes(el, oldChildren, 0, oldChildren.length - 1)
      }
      // 有旧的 text 没有新的 text
      else if (is.string(oldText)) {
        api[ oldRaw ? 'setHtmlContent' : 'setTextContent' ](el, char.CHAR_BLANK)
      }
    }

    if (hook[HOOK_POSTPATCH]) {
      hook[HOOK_POSTPATCH](oldVnode, vnode)
    }

  }

  return function(oldVnode, vnode) {

    hookEmitter.fire(HOOK_PRE)

    if (!oldVnode.sel && oldVnode.tagName) {
      oldVnode = createVnode(oldVnode)
    }

    let insertedQueue = [ ]

    if (isSameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedQueue)
    }
    else {
      createElement(vnode, insertedQueue)
      replaceVnode(
        api.parentNode(oldVnode.el),
        oldVnode,
        vnode
      )
    }

    array.each(
      insertedQueue,
      function (vnode) {
        let hook = object.get(vnode, `data.hook.${HOOK_INSERT}`)
        if (hook) {
          hook.value(vnode)
        }
      }
    )

    hookEmitter.fire(HOOK_POST)

    return vnode

  }
}
