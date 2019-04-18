import * as config from 'yox-config'

import isDef from 'yox-common/function/isDef'

import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as string from 'yox-common/util/string'
import * as object from 'yox-common/util/object'

import Emitter from 'yox-common/util/Emitter'
import CustomEvent from 'yox-common/util/Event'

import * as field from './field'

const CHAR_WHITESPACE = ' ',

domain = 'http://www.w3.org/',

namespaces = {
  svg: domain + '2000/svg',
  xml: domain + 'XML/1998/namespace',
  xlink: domain + '1999/xlink',
}

let doc = env.doc,

addEventListener: Function = env.EMPTY_FUNCTION,

removeEventListener: Function = env.EMPTY_FUNCTION,

findElement: Function = env.EMPTY_FUNCTION

if (doc) {
  if (doc.addEventListener) {
    addEventListener = function (element: HTMLElement, type: string, listener: (event: Event) => void) {
      element.addEventListener(type, listener, env.FALSE)
    }
    removeEventListener = function (element: HTMLElement, type: string, listener: (event: Event) => void) {
      element.removeEventListener(type, listener, env.FALSE)
    }
  }
  else {
    addEventListener = function (element: any, type: string, listener: (event: Event) => void) {
      element.attachEvent(`on${type}`, listener)
    }
    removeEventListener = function (element: any, type: string, listener: (event: Event) => void) {
      element.detachEvent(`on${type}`, listener)
    }
  }
  if (doc.querySelector) {
    findElement = function (selector: string, context?: HTMLElement) {
      return (doc || context).querySelector(selector)
    }
  }
  else {
    findElement = function (selector: string) {
      // 去掉 #
      return doc.getElementById(string.slice(selector, 1))
    }
  }
}

export function createElement(tag: string, isSvg?: boolean): HTMLElement {
  return isSvg
    ? doc.createElementNS(namespaces.svg, tag)
    : doc.createElement(tag)
}

export function createText(text: string): Node {
  return doc.createTextNode(text)
}

export function createComment(text: string): Node {
  return doc.createComment(text)
}

export function createEvent(event: any, node: HTMLElement): any {
  return event
}

export function isElement(node: Node): boolean {
  return node.nodeType === 1
}

export function prop(node: HTMLElement, name: string, value: string | number | boolean): string | number | boolean | void {
  if (isDef(value)) {
    object.set(node, name, value, env.FALSE)
  }
  else {
    return object.get(node, name)
  }
}

export function removeProp(node: HTMLElement, name: string, hint?: number) {
  object.set(
    node,
    name,
    hint === config.HINT_BOOLEAN
      ? env.FALSE
      : env.EMPTY_STRING,
    env.FALSE
  )
}

export function attr(node: HTMLElement, name: string, value?: string): string | void {
  if (isDef(value)) {
    node.setAttribute(name, value)
  }
  else {
    return node.getAttribute(name)
  }
}

export function removeAttr(node: HTMLElement, name: string) {
  node.removeAttribute(name)
}

export function data(node: HTMLElement, name: string, value?: string): string | void {
  // 不用 dataset，因为 removeData 时不好处理，这样反而还少了兼容问题
  return attr(node, `data-${string.hyphenate(name)}`, value)
}

export function removeData(node: HTMLElement, name: string) {
  removeAttr(node, `data-${string.hyphenate(name)}`)
}

export function before(parentNode: Node, newNode: Node, referenceNode: Node) {
  if (referenceNode) {
    parentNode.insertBefore(newNode, referenceNode)
  }
  else {
    append(parentNode, newNode)
  }
}

export function append(parentNode: Node, child: Node) {
  parentNode.appendChild(child)
}

export function replace(parentNode: Node, newNode: Node, oldNode: Node) {
  parentNode.replaceChild(newNode, oldNode)
}

export function remove(parentNode: Node, child: Node) {
  parentNode.removeChild(child)
}

export function parent(node: Node): Node {
  return node.parentNode
}

export function next(node: Node) {
  return node.nextSibling
}

export function tag(node: HTMLElement) {
  const { tagName } = node
  return string.falsy(tagName)
    ? env.EMPTY_STRING
    : tagName.toLowerCase()
}

export function children(node: Node) {
  return node.childNodes
}

export function text(node: HTMLElement, content?: string): string | void {
  if (isDef(content)) {
    node.textContent = content
  }
  else {
    return node.textContent
  }
}

export function html(node: HTMLElement, content?: string): string | void {
  if (isDef(content)) {
    node.innerHTML = content
  }
  else {
    return node.innerHTML
  }
}

export function addClass(element: HTMLElement, className: string) {
  const { classList } = element
  if (classList && classList.add) {
    classList.add(className)
  }
  else {
    const classes = element.className.split(CHAR_WHITESPACE)
    if (!array.has(classes, className)) {
      array.push(classes, className)
      element.className = array.join(classes, CHAR_WHITESPACE)
    }
  }
}

export function removeClass(element: HTMLElement, className: string) {
  const { classList } = element
  if (classList && classList.remove) {
    classList.remove(className)
  }
  else {
    const classes = element.className.split(CHAR_WHITESPACE)
    if (array.remove(classes, className)) {
      element.className = array.join(classes, CHAR_WHITESPACE)
    }
  }
}

export function find(selector: string, context?: HTMLElement): HTMLElement | void {
  return findElement(selector, context)
}

export function on(element: HTMLElement, type: string, listener: (event: CustomEvent) => void, context?: any) {

  const emitter: Emitter = element[field.EMITTER] || (element[field.EMITTER] = new Emitter()),

  nativeListeners = emitter.nativeListeners || (emitter.nativeListeners = {})

  // 一个元素，相同的事件，只注册一个 native listener
  if (!nativeListeners[type]) {

    // 特殊事件
    const special = specialEvents[type],

    // 唯一的原生监听器
    nativeListener = function (event: Event | CustomEvent) {

      emitter.fire(
        event instanceof CustomEvent
          ? event
          : new CustomEvent(createEvent(event, element))
      )

    }

    nativeListeners[type] = nativeListener

    if (special) {
      special.on(element, nativeListener)
    }
    else {
      addEventListener(element, type, nativeListener)
    }

  }
  emitter.on(
    type,
    {
      func: listener,
      ctx: context,
    }
  )
}

export function off(element: HTMLElement, type: string, listener: (event: CustomEvent) => void) {

  let emitter: Emitter = element[field.EMITTER],

  { listeners, nativeListeners } = emitter

  // emitter 会根据 type 和 listener 参数进行适当的删除
  emitter.off(type, listener)

  // 如果注册的 type 事件都解绑了，则去掉原生监听器
  if (!emitter.has(type)) {

    const special = specialEvents[type],

    nativeListener = nativeListeners[type]

    if (special) {
      special.off(element, nativeListener)
    }
    else {
      removeEventListener(element, type, nativeListener)
    }

    nativeListeners[type] = env.UNDEFINED

  }

  if (object.empty(listeners)) {
    element[field.EMITTER] = env.UNDEFINED
  }

}

/**
 * 输入事件
 */
const INPUT = 'input'

/**
 * 跟输入事件配套使用的事件
 */
const COMPOSITION_START = 'compositionstart'

/**
 * 跟输入事件配套使用的事件
 */
const COMPOSITION_END = 'compositionend'

/**
 * 特殊事件，外部可扩展
 */
export const specialEvents = {
  input: {
    on(node: HTMLElement, listener: Function) {
      let locked = env.FALSE
      on(node, COMPOSITION_START, listener[COMPOSITION_START] = function () {
        locked = env.TRUE
      })
      on(node, COMPOSITION_END, listener[COMPOSITION_END] = function (event: CustomEvent) {
        locked = env.FALSE
        event.type = INPUT
        listener(event)
      })
      addEventListener(node, INPUT, listener[INPUT] = function (event: CustomEvent) {
        if (!locked) {
          listener(event)
        }
      })
    },
    off(node: HTMLElement, listener: Function) {
      off(node, COMPOSITION_START, listener[COMPOSITION_START])
      off(node, COMPOSITION_END, listener[COMPOSITION_END])
      removeEventListener(node, INPUT, listener[INPUT])
      listener[COMPOSITION_START] =
      listener[COMPOSITION_END] =
      listener[INPUT] = env.UNDEFINED
    }
  }
}
