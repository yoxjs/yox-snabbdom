import * as config from 'yox-config'

import isDef from 'yox-common/function/isDef'

import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as string from 'yox-common/util/string'
import * as object from 'yox-common/util/object'
import VNode from 'yox-template-compiler/src/vnode/VNode';

const CHAR_WHITESPACE = ' ',

DATA_VNODE = 'v',

domain = 'http://www.w3.org/',

namespaces = {
  svg: domain + '2000/svg',
  xml: domain + 'XML/1998/namespace',
  xlink: domain + '1999/xlink',
}

export function createElement(tag: string, isSvg: boolean): HTMLElement {
  return isSvg
    ? env.doc.createElementNS(namespaces.svg, tag)
    : env.doc.createElement(tag)
}

export function createText(text: string): Node {
  return env.doc.createTextNode(text)
}

export function createComment(text: string): Node {
  return env.doc.createComment(text)
}

export function createEvent(event: any): any {
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

// id 是线性递增的，因此用数组存储最为合适
const vnodes = []

export function vnode(node: HTMLElement, id?: number, vnode?: VNode): VNode | void {
  if (id && vnode) {
    data(node, DATA_VNODE, `${id}`)
    vnodes[id] = vnode
  }
  else {
    const key = id ? id : data(node, DATA_VNODE)
    if (key) {
      return vnodes[key]
    }
  }
}

export function removeVnode(node: HTMLElement, id?: number) {
  const key = id ? id : data(node, DATA_VNODE)
  if (key) {
    removeData(node, DATA_VNODE)
    vnodes[key] = env.UNDEFINED
  }
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
  return content == env.NULL
    ? node.textContent
    : node.textContent = content
}

export function html(node: HTMLElement, content?: string): string | void {
  return content == env.NULL
    ? node.innerHTML
    : node.innerHTML = content
}

export function find(selector: string, context?: Node) {
  return (context || env.doc).querySelector(selector)
}

export function on(element: HTMLElement, type: string, listener: (event: Event) => void) {
  element.addEventListener(type, listener, env.FALSE)
}

export function off(element: HTMLElement, type: string, listener: (event: Event) => void) {
  element.removeEventListener(type, listener, env.FALSE)
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
