
import * as env from 'yox-common/util/env'

export function createElement(tagName) {
  return env.doc.createElement(tagName)
}

export function createElementNS(namespaceURI, qualifiedName) {
  return env.doc.createElementNS(namespaceURI, qualifiedName)
}

export function createTextNode(text) {
  return env.doc.createTextNode(text)
}

export function insertBefore(parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function removeChild(node, child) {
  node.removeChild(child)
}

export function appendChild(node, child) {
  node.appendChild(child)
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
