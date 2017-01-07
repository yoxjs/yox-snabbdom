
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

function createKeyToOldIdx(children, start, end) {
  var i, map = {}, key;
  for (i = start; i <= end; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

function emptyNodeAt(elm) {
  return new VNode(
    stringifySel(elm),
    { },
    [ ],
    env.UNDEFINED,
    elm
  )
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

  function createElm(vnode, insertedVnodeQueue) {

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
              createElm(child, insertedVnodeQueue)
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
        insertedVnodeQueue.push(vnode)
      }
    }
    else {
      elm = vnode.elm = api.createTextNode(text)
    }

    return elm
  }

  function addVnodes(parentElm, before, vnodes, start, end, insertedVnodeQueue) {
    for (; start <= end; ++start) {
      api.insertBefore(parentElm, createElm(vnodes[start], insertedVnodeQueue), before);
    }
  }

  function removeVnode(parentElm, vnode) {
    let { sel, elm } = vnode
    if (sel) {
      destroyVnode(vnode)
      api.removeChild(parentElm, elm)
      hookEmitter.fire(HOOK_REMOVE, vnode)

      result = object.get(vnode, `data.hook.${HOOK_REMOVE}`)
      if (result) {
        result.value(vnode)
      }
    }
    else {
      api.removeChild(parentElm, elm)
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

  function updateChildren(parentElm, oldChildren, newChildren, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldChildren.length - 1;
    var oldStartVnode = oldChildren[0];
    var oldEndVnode = oldChildren[oldEndIdx];
    var newEndIdx = newChildren.length - 1;
    var newStartVnode = newChildren[0];
    var newEndVnode = newChildren[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldChildren[++oldStartIdx]; // Vnode has been moved left
      }
      else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldChildren[--oldEndIdx];
      }
      else if (isSameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldChildren[++oldStartIdx];
        newStartVnode = newChildren[++newStartIdx];
      }
      else if (isSameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldChildren[--oldEndIdx];
        newEndVnode = newChildren[--newEndIdx];
      }
      else if (isSameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldChildren[++oldStartIdx];
        newEndVnode = newChildren[--newEndIdx];
      }
      else if (isSameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldChildren[--oldEndIdx];
        newStartVnode = newChildren[++newStartIdx];
      }
      else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldChildren, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newChildren[++newStartIdx];
        }
        else {
          elmToMove = oldChildren[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldChildren[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newChildren[++newStartIdx];
        }
      }
    }

    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newChildren[newEndIdx+1]) ? null : newChildren[newEndIdx+1].elm;
      addVnodes(parentElm, before, newChildren, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldChildren, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {

    // 不可变数据，引用一样不用比了
    if (oldVnode === vnode) {
      return
    }

    const hook = object.get(vnode, 'data.hook')
    hook = hook ? hook.value : { }

    if (hook[HOOK_PREPATCH]) {
      hook[HOOK_PREPATCH](oldVnode, vnode)
    }

    let elm = vnode.elm = oldVnode.elm
    if (!isSameVnode(oldVnode, vnode)) {
      let parentElm = api.parentNode(elm)
      api.insertBefore(
        parentElm,
        createElm(vnode, insertedVnodeQueue),
        elm
      )
      removeVnode(parentElm, oldVnode)
      return
    }

    hookEmitter.fire(HOOK_UPDATE, [ oldVnode, vnode ])

    if (hook[HOOK_UPDATE]) {
      hook[HOOK_UPDATE](oldVnode, vnode)
    }

    let { text, children } = vnode
    if (is.string(text)) {
      if (text !== oldVnode.text) {
        api.setTextContent(elm, text)
      }
    }
    else {
      if (children && oldVnode.children) {
        if (children !== oldVnode.children) {
          updateChildren(elm, oldVnode.children, children, insertedVnodeQueue)
        }
      }
      else if (children) {
        if (is.string(oldVnode.text)) {
          api.setTextContent(elm, '')
        }
        addVnodes(elm, env.NULL, children, 0, children.length - 1, insertedVnodeQueue)
      }
      else if (oldVnode.children) {
        array.each(
          oldVnode.children,
          function (child) {
            removeVnode(elm, child)
          }
        )
      }
      else if (is.string(oldVnode.text)) {
        api.setTextContent(elm, '')
      }
    }

    if (hook[HOOK_POSTPATCH]) {
      hook[HOOK_POSTPATCH](oldVnode, vnode)
    }

  }

  return function(oldVnode, vnode) {

    hookEmitter.fire(HOOK_PRE)

    if (!oldVnode.sel) {
      oldVnode = emptyNodeAt(oldVnode)
    }

    let insertedVnodeQueue = [ ]

    if (isSameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    }
    else {
      let { elm } = oldVnode
      let parentNode = api.parentNode(elm)

      createElm(vnode, insertedVnodeQueue);

      if (parentNode) {
        api.insertBefore(
          parentNode,
          vnode.elm,
          api.nextSibling(elm)
        )
        removeVnode(parentNode, oldVnode)
      }
    }

    array.each(
      insertedVnodeQueue,
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
