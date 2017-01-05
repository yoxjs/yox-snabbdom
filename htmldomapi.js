
import * as env from 'yox-common/util/env'

export default {
  createElement(tagName) {
    return env.doc.createElement(tagName)
  },

  createElementNS(namespaceURI, qualifiedName) {
    return env.doc.createElementNS(namespaceURI, qualifiedName)
  },

  createTextNode(text) {
    return env.doc.createTextNode(text)
  },

  insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode)
  },

  removeChild(node, child) {
    node.removeChild(child)
  },

  appendChild(node, child) {
    node.appendChild(child)
  },

  parentNode(node) {
    return node.parentElement
  },

  nextSibling(node) {
    return node.nextSibling
  },

  tagName(node) {
    return node.tagName
  },

  setTextContent(node, text) {
    node.textContent = text
  }
}
