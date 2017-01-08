
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

import Emitter from 'yox-common/util/Emitter'
import execute from 'yox-common/function/execute'

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
    key = vnodes[ i ].key
    if (key != env.NULL) {
      result[ key ] = i
    }
  }
  return result
}

export function init(modules, api = domApi) {

  let moduleEmitter = new Emitter()

  array.each(
    moduleHooks,
    function (hook) {
      array.each(
        modules,
        function (item) {
          moduleEmitter.on(hook, item[ hook ])
        }
      )
    }
  )

  let stringifySel = function (el) {
    let list = [ api.tag(el) ]
    let { id, className } = el
    if (id) {
      array.push(list, `${char.CHAR_HASH}${id}`)
    }
    if (className) {
      array.push(list, `${char.CHAR_DOT}${className.split(whitespacePattern).join(char.CHAR_DOT)}`)
    }
    return list.join(char.CHAR_BLANK)
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
      className = sel.slice(dotIndex + 1).split(char.CHAR_DOT).join(char.CHAR_WHITESPACE)
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

  let createElement = function (vnode, insertedQueue) {

    let { sel, data, children, raw, text } = vnode

    let hook = (data && data.hook) || { }
    execute(
      hook[ HOOK_INIT ],
      env.NULL,
      vnode
    )

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
        api.append(
          el,
          api[ raw ? 'createFragment' : 'createText' ](text)
        )
      }

      if (data) {
        data = [ emptyNode, vnode ]
        moduleEmitter.fire(HOOK_CREATE, data)

        execute(
          hook[ HOOK_CREATE ],
          env.NULL,
          data
        )

        if (hook[ HOOK_INSERT ]) {
          insertedQueue.push(vnode)
        }
      }

      return el
    }
    else {
      return vnode.el = api[ raw ? 'createFragment' : 'createText' ](text)
    }
  }

  let addVnodes = function (parentNode, vnodes, startIndex, endIndex, insertedQueue, before) {
    for (let i = startIndex; i <= endIndex; i++) {
      addVnode(parentNode, vnodes[ i ], insertedQueue, before)
    }
  }

  let addVnode = function (parentNode, vnode, insertedQueue, before) {
    api.before(
      parentNode,
      createElement(vnode, insertedQueue),
      before
    )
  }

  let removeVnodes = function (parentNode, vnodes, startIndex, endIndex) {
    for (let i = startIndex; i <= endIndex; i++) {
      removeVnode(parentNode, vnodes[ i ])
    }
  }

  let removeVnode = function (parentNode, vnode) {
    let { sel, el, data } = vnode
    if (sel) {
      destroyVnode(vnode)
      api.remove(parentNode, el)

      if (data) {
        moduleEmitter.fire(HOOK_REMOVE, vnode)

        data = object.get(data, `hook.${HOOK_REMOVE}`)
        if (data) {
          execute(
            data.value,
            env.NULL,
            vnode
          )
        }
      }

    }
    else {
      api.remove(parentNode, el)
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

      moduleEmitter.fire(HOOK_DESTROY, vnode)

      data = object.get(data, `hook.${HOOK_DESTROY}`)
      if (data) {
        execute(
          data.value,
          env.NULL,
          vnode
        )
      }

    }
  }

  let replaceVnode = function (parentNode, oldVnode, vnode) {
    if (parentNode) {
      api.before(
        parentNode,
        vnode.el,
        oldVnode.el
      )
      removeVnode(parentNode, oldVnode)
    }
  }

  let updateChildren = function (parentNode, oldChildren, newChildren, insertedQueue) {

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
      else if (isSameVnode(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode, insertedQueue)
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
          patchVnode(activeVnode, newStartVnode, insertedQueue)
          oldChildren[ oldIndex ] = env.NULL
        }
        // 新元素
        else {
          createElement(newStartVnode, insertedQueue)
          activeVnode = newStartVnode
        }

        api.before(
          parentNode,
          activeVnode.el,
          oldStartVnode.el
        )
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
        insertedQueue,
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

  let patchVnode = function (oldVnode, vnode, insertedQueue) {

    if (oldVnode === vnode) {
      return
    }

    let { data } = vnode
    let hook = (data && data.hook) || { }

    let args = [ oldVnode, vnode ]
    execute(
      hook[ HOOK_PREPATCH ],
      env.NULL,
      args
    )

    let el = vnode.el = oldVnode.el
    if (!isSameVnode(oldVnode, vnode)) {
      createElement(vnode, insertedQueue)
      replaceVnode(
        api.parent(el),
        oldVnode,
        vnode
      )
      return
    }

    if (data) {
      moduleEmitter.fire(HOOK_UPDATE, args)
      execute(
        hook[ HOOK_UPDATE ],
        env.NULL,
        args
      )
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
          api.replace(
            api.parent(el),
            api.createFragment(newText),
            el
          )
        }
        else {
          api.text(el, newText)
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
          api[ oldRaw ? 'html' : 'text' ](el, char.CHAR_BLANK)
        }
        addVnodes(el, newChildren, 0, newChildren.length - 1, insertedQueue)
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        removeVnodes(el, oldChildren, 0, oldChildren.length - 1)
      }
      // 有旧的 text 没有新的 text
      else if (is.string(oldText)) {
        api[ oldRaw ? 'html' : 'text' ](el, char.CHAR_BLANK)
      }
    }

    execute(
      hook[ HOOK_POSTPATCH ],
      env.NULL,
      args
    )

  }

  return function (oldVnode, vnode) {

    moduleEmitter.fire(HOOK_PRE)

    if (!oldVnode.sel && api.tag(oldVnode)) {
      oldVnode = createVnode(oldVnode)
    }

    let insertedQueue = [ ]
    if (isSameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedQueue)
    }
    else {
      createElement(vnode, insertedQueue)
      replaceVnode(
        api.parent(oldVnode.el),
        oldVnode,
        vnode
      )
    }

    array.each(
      insertedQueue,
      function (vnode) {
        execute(
          vnode.data.hook[ HOOK_INSERT ],
          env.NULL,
          vnode
        )
      }
    )

    moduleEmitter.fire(HOOK_POST)

    return vnode

  }
}
