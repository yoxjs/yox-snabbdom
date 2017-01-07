
import execute from 'yox-common/function/execute'

import is from 'yox-common/util/is'
import env from 'yox-common/util/env'
import char from 'yox-common/util/char'
import array from 'yox-common/util/array'
import Emitter from 'yox-common/util/Emitter'

import VNode from './vnode'
import domApi from './htmldomapi'

const HOOK_INIT = 'init'
const HOOK_CREATE = 'create'
const HOOK_UPDATE = 'update'
const HOOK_INSERT = 'insert'
const HOOK_REMOVE = 'remove'
const HOOK_DESTROY = 'destroy'

const HOOK_PRE = 'pre'
const HOOK_POST = 'post'

const HOOK_PREPATCH = 'prepatch'
const HOOK_POSTPATCH = 'postpatch'

const hooks = [ HOOK_CREATE, HOOK_UPDATE, HOOK_REMOVE, HOOK_DESTROY, HOOK_PRE, HOOK_POST ]

const whitespacePattern = /\s+/

let emptyNode = new VNode(env.EMPTY, { }, [ ])

function isSameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key
    && vnode1.sel === vnode2.sel
}

function stringifySel(elm) {
  let terms = [
    api.tagName(elm).toLowerCase()
  ]
  let { id, className } = elm
  if (id) {
    array.push(terms, `${char.CHAR_HASH}${id}`)
  }
  if (className) {
    array.push(terms, `${char.CHAR_DOT}${className.split(whitespacePattern).join(char.CHAR_DOT)}`)
  }
  return terms.join(env.EMPTY)
}

function parseSel(sel) {

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

function createVnode(el) {
  new VNode(
    stringifySel(el),
    { },
    [ ],
    env.UNDEFINED,
    el
  )
}

function replaceVnode(parentEl, oldVnode, vnode) {
  if (parentEl) {
    api.insertBefore(
      parentEl,
      vnode.elm,
      oldVnode.elm
    )
    removeVnode(parentEl, oldVnode)
  }
}

export function init(modules, api = domApi) {

  let hookEmitter = new Emitter(), result

  // 注册模块的钩子函数
  array.each(
    hooks,
    function (hook) {
      array.each(
        modules,
        function (mod) {
          hookEmitter.on(hook, mod[hook])
        }
      )
    }
  )

  function createElement(vnode, insertedQueue) {

    let hook = object.get(vnode, 'data.hook')
    hook = hook ? hook.value : { }

    if (hook[HOOK_INIT]) {
      hook[HOOK_INIT](vnode)
    }

    let elm
    let { sel, children, text } = vnode
    if (is.string(sel)) {
      let { tagName, id, className } = parseSel(sel)
      elm = api.createElement(tagName)
      if (id) {
        elm.id = id
      }
      if (className) {
        elm.className = className
      }

      vnode.elm = elm

      if (is.array(children)) {
        array.each(
          children,
          function (child) {
            api.appendChild(
              elm,
              createElement(child, insertedQueue)
            )
          }
        )
      }
      else if (is.string(text)) {
        api.appendChild(
          elm,
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
    }
    else {
      elm = vnode.elm = api.createTextNode(text)
    }

    return elm
  }

  function addVnodes(parentEl, before, vnodes, start, end, insertedQueue) {
    for (; start <= end; ++start) {
      api.insertBefore(parentEl, createElement(vnodes[start], insertedQueue), before);
    }
  }

  function removeVnode(parentEl, vnode) {
    let { sel, elm } = vnode
    if (sel) {
      destroyVnode(vnode)
      api.removeChild(parentEl, elm)
      hookEmitter.fire(HOOK_REMOVE, vnode)

      result = object.get(vnode, `data.hook.${HOOK_REMOVE}`)
      if (result) {
        result.value(vnode)
      }
    }
    else {
      api.removeChild(parentEl, elm)
    }
  }

  function destroyVnode(vnode) {
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

  function updateChildren(parentEl, oldChildren, newChildren, insertedQueue) {
    var oldStartIndex = 0, newStartIndex = 0;
    var oldEndIndex = oldChildren.length - 1;
    var oldStartVnode = oldChildren[0];
    var oldEndVnode = oldChildren[oldEndIndex];
    var newEndIndex = newChildren.length - 1;
    var newStartVnode = newChildren[0];
    var newEndVnode = newChildren[newEndIndex];
    var oldKeyToIndex, oldIndex, activeVnode, before;

    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {

      if (!oldStartVnode) {
        oldStartVnode = oldChildren[++oldStartIndex]; // Vnode has been moved left
      }
      else if (!oldEndVnode) {
        oldEndVnode = oldChildren[--oldEndIndex];
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
          oldKeyToIndex = { }
          for (let i = oldStartIndex, key; i <= oldEndIndex; i++) {
            key = oldChildren[i].key
            if (key != env.NULL) {
              oldKeyToIndex[key] = i
            }
          }
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
      before = isUndef(newChildren[newEndIndex+1]) ? null : newChildren[newEndIndex+1].el
      addVnodes(parentEl, before, newChildren, newStartIndex, newEndIndex, insertedQueue)
    } else if (newStartIndex > newEndIndex) {
      removeVnodes(parentEl, oldChildren, oldStartIndex, oldEndIndex)
    }
  }

  function patchVnode(oldVnode, vnode, insertedQueue) {

    // 不可变数据，引用相同不用比了
    if (oldVnode === vnode) {
      return
    }

    const hook = object.get(vnode, 'data.hook')
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

    hookEmitter.fire(HOOK_UPDATE, [ oldVnode, vnode ])

    if (hook[HOOK_UPDATE]) {
      hook[HOOK_UPDATE](oldVnode, vnode)
    }

    let newText = vnode.text
    let newChildren = vnode.children

    let oldText = oldVnode.text
    let oldChildren = oldVnode.children

    if (is.string(newText)) {
      if (newText !== oldText) {
        api.setTextContent(el, newText)
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
          api.setTextContent(el, char.CHAR_BLANK)
        }
        array.each(
          newChildren,
          function (child) {
            api.appendChild(
              el,
              createElement(child, insertedQueue)
            )
          }
        )
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        array.each(
          oldChildren,
          function (child) {
            removeVnode(el, child)
          }
        )
      }
      // 有旧的 text 没有新的 text
      else if (is.string(oldText)) {
        api.setTextContent(el, char.CHAR_BLANK)
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
