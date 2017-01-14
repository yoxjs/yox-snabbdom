
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as string from 'yox-common/util/string'

const { SVGElement } = env.win

export function createElement(tagName, parentNode) {
  return tagName === 'svg'
    || (parentNode && SVGElement && parentNode instanceof SVGElement)
    ? env.doc.createElementNS('http://www.w3.org/2000/svg', tagName)
    : env.doc.createElement(tagName)
}

export function createFragment(content) {
  let fragment = env.doc.createDocumentFragment()
  if (content) {
    html(fragment, content)
  }
  return fragment
}

export function createText(text) {
  return env.doc.createTextNode(text || char.CHAR_BLANK)
}

export function createComment(text) {
  return env.doc.createComment(text || char.CHAR_BLANK)
}

export function createEvent(event) {
  return event
}

export function isElement(node) {
  return node.nodeType === 1
}

export function isFragment(node) {
  return node.nodeType === 11
}

export function before(parentNode, newNode, referenceNode) {
  if (referenceNode) {
    parentNode.insertBefore(newNode, referenceNode)
  }
  else {
    append(parentNode, newNode)
  }
}

export function replace(parentNode, newNode, oldNode) {
  parentNode.replaceChild(newNode, oldNode)
}

export function remove(parentNode, child) {
  parentNode.removeChild(child)
}

export function append(parentNode, child) {
  parentNode.appendChild(child)
}

export function parent(node) {
  return node.parentElement
}

export function next(node) {
  return node.nextSibling
}

export function tag(node) {
  let { tagName } = node
  return string.falsy(tagName)
    ? char.CHAR_BLANK
    : tagName.toLowerCase()
}

export function children(node) {
  return node.childNodes
}

export function text(node, content) {
  node.textContent = content
}

export function html(node, content) {
  if (isElement(node)) {
    node.innerHTML = content
  }
  else if (isFragment(node)) {
    array.each(
      children(node),
      function (child) {
        remove(node, child)
      }
    )
    let element = createElement('div')
    element.innerHTML = content
    array.each(
      children(element),
      function (child) {
        append(node, child)
      }
    )
  }
}

export function find(selector, context) {
  return (context || env.doc).querySelector(selector)
}

export function on(element, type, listener) {
  element.addEventListener(type, listener, env.FALSE)
}

export function off(element, type, listener) {
  element.removeEventListener(type, listener, env.FALSE)
}
