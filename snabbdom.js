
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'
import * as string from 'yox-common/util/string'
import * as logger from 'yox-common/util/logger'

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

export function createElementVnode(tag, attrs, props, directives, children, slots, ref, key, instance, hooks) {
  return {
    tag,
    attrs,
    props,
    directives,
    children,
    slots,
    ref,
    key,
    instance,
    text: env.UNDEFINED,
    hooks,
  }
}

export function createComponentVnode(tag, attrs, props, directives, children, slots, ref, key, instance, hooks) {
  let vnode = createElementVnode(tag, attrs, props, directives, children, slots, ref, key, instance, hooks)
  vnode.component = env.TRUE
  return vnode
}

export function isVnode(vnode) {
  return vnode
    && object.has(vnode, 'text')
}

export function isTextVnode(vnode) {
  return isVnode(vnode)
    && !object.has(vnode, 'tag')
}

export function init(api) {

  let createElement = function (vnode, data) {

    let { el, tag, component, attrs, slots, directives, children, text, instance } = vnode

    vnode.data = { }

    if (string.falsy(tag)) {
      return vnode.el = api.createText(text)
    }

    if (tag === TAG_COMMENT) {
      return vnode.el = api.createComment(text)
    }

    // 不管是组件还是元素，必须先有一个元素
    el = vnode.el = api.createElement(component ? 'i' : tag)

    if (component) {

      api.component(el, vnode)

      instance.component(
        tag,
        function (options) {

          if (!options) {
            logger.fatal(`"${tag}" component is not found.`)
          }

          vnode = api.component(el)

          if (vnode && tag === vnode.tag) {

            let host = vnode.parent || instance, extensions

            let modelKeypath = directives && directives.model && directives.model.value
            if (modelKeypath) {
              if (!attrs) {
                attrs = vnode.attrs = { }
              }
              let field = options.model || 'value'
              if (!object.has(attrs, field)) {
                attrs[ field ] = host.get(modelKeypath)
              }
              extensions = {
                $model: field,
              }
            }

            component = host.create(
              options,
              {
                el,
                slots,
                props: attrs,
                replace: env.TRUE,
                extensions,
              }
            )
            el = component.$el
            if (!el) {
              logger.fatal(`"${tag}" component must have a root element.`)
            }

            vnode.el = el
            api.component(el, component)

            enterVnode(vnode)

            moduleEmitter.fire(HOOK_CREATE, vnode, api)

          }

        }
      )

    }
    else {

      if (is.array(children)) {
        addVnodes(el, children, 0, children[ env.RAW_LENGTH ] - 1)
      }
      else if (is.string(text)) {
        api.append(
          el,
          api.createText(text)
        )
      }

      moduleEmitter.fire(HOOK_CREATE, vnode, api)

    }

    return el

  }

  let addVnodes = function (parentNode, vnodes, startIndex, endIndex, before) {
    let vnode
    while (startIndex <= endIndex) {
      vnode = vnodes[ startIndex ]
      if (createElement(vnode)) {
        insertVnode(parentNode, vnode, before)
      }
      startIndex++
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
  }

  let destroyVnode = function (vnode) {
    let { el, component, children } = vnode
    if (component) {
      component = api.component(el)
      if (vnode.parent === vnode.instance) {
        if (component.set) {
          moduleEmitter.fire(HOOK_DESTROY, vnode, api)
          api.component(el, env.NULL)
          component.destroy()
          return env.TRUE
        }
        api.component(el, env.NULL)
      }
      else {
        return
      }
    }
    else if (children) {
      array.each(
        children,
        function (child) {
          destroyVnode(child)
        }
      )
    }
    moduleEmitter.fire(HOOK_DESTROY, vnode, api)
  }

  let insertVnode = function (parentNode, vnode, oldVnode) {
    let { el } = vnode, hasParent = api.parent(el)
    api.before(parentNode, el, oldVnode ? oldVnode.el : env.NULL)
    if (!hasParent) {
      enterVnode(vnode)
    }
  }

  let enterVnode = function (vnode) {
    let { el, hooks, data, instance } = vnode
    if (hooks) {
      if (data.leaving) {
        data.leaving()
      }
      execute(
        hooks.enter,
        instance,
        [ el, env.noop ]
      )
    }
  }

  let leaveVnode = function (vnode, done) {
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
  }

  let updateChildren = function (parentNode, oldChildren, newChildren) {

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

        oldIndex = oldKeyToIndex[ newStartVnode.key ]

        // 移动元素
        if (is.number(oldIndex)) {
          activeVnode = oldChildren[ oldIndex ]
          patchVnode(activeVnode, newStartVnode)
          oldChildren[ oldIndex ] = env.NULL
        }
        // 新元素
        else if (createElement(newStartVnode)) {
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
  }

  let patchVnode = function (oldVnode, vnode) {

    if (oldVnode === vnode) {
      return
    }

    let { el, component, data } = oldVnode

    vnode.el = el
    vnode.data = data

    if (!isPatchable(oldVnode, vnode)) {
      let parentNode = api.parent(el)
      if (createElement(vnode) && parentNode) {
        insertVnode(parentNode, vnode, oldVnode)
        removeVnode(parentNode, oldVnode)
      }
      return
    }

    if (component) {
      component = api.component(el)
      if (!component.set) {
        api.component(el, vnode)
        return;
      }
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
        addVnodes(el, newChildren, 0, newChildren[ env.RAW_LENGTH ] - 1)
      }
      // 有旧的没新的 - 删除节点
      else if (oldChildren) {
        removeVnodes(el, oldChildren, 0, oldChildren[ env.RAW_LENGTH ] - 1)
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
        data: { },
      }
      : oldVnode,
      vnode
    )

    return vnode

  }
}
