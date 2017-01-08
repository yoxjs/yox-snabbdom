
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'

export function createElement(tagName) {
  return env.doc.createElement(tagName)
}

export function createFragment(html) {
  let fragment = env.doc.createDocumentFragment()
  setHtmlContent(fragment, html)
  return fragment
}

export function createTextNode(text) {
  return env.doc.createTextNode(text)
}

export function insertBefore(parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function replaceChild(parentNode, newNode, oldNode) {
  parentNode.replaceChild(newNode, oldNode)
}

export function removeChild(parentNode, child) {
  parentNode.removeChild(child)
}

export function appendChild(parentNode, child) {
  parentNode.appendChild(child)
}

export function parentNode(node) {
  return node.parentElement
}

export function nextSibling(node) {
  return node.nextSibling
}

export function tagName(node) {
  return node.tagName
}

export function setTextContent(node, text) {
  node.textContent = text
}

export function setHtmlContent(node, html) {
  if (tagName(node)) {
    node.innerHTML = html
  }
  else {
    array.each(
      node.childNodes,
      function (child) {
        node.removeChild(child)
      }
    )
    let element = createElement('div')
    element.innerHTML = html
    array.each(
      element.childNodes,
      function (child) {
        node.appendChild(child)
      }
    )
  }
}
