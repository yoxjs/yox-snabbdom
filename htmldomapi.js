
import isDef from 'yox-common/function/isDef'

import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as string from 'yox-common/util/string'
import * as object from 'yox-common/util/object'

const attr2Prop = { }
attr2Prop[ 'for' ] = 'htmlFor'
attr2Prop[ 'value' ] = 'value'
attr2Prop[ 'class' ] = 'className'
attr2Prop[ 'style' ] = 'style.cssText'
attr2Prop[ 'nohref' ] = 'noHref'
attr2Prop[ 'noshade' ] = 'noShade'
attr2Prop[ 'noresize' ] = 'noResize'
attr2Prop[ 'readonly' ] = 'readOnly'
attr2Prop[ 'defaultchecked' ] = 'defaultChecked'
attr2Prop[ 'defaultmuted' ] = 'defaultMuted'
attr2Prop[ 'defaultselected' ] = 'defaultSelected'

const svgTags = array.toObject(
  ('svg,g,defs,desc,metadata,symbol,use,'
  + 'image,path,rect,circle,line,ellipse,polyline,polygon,'
  + 'text,tspan,tref,textpath,'
  + 'marker,pattern,clippath,mask,filter,cursor,view,animate,'
  + 'font,font-face,glyph,missing-glyph').split(',')
)

const namespaces = {
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink',
}

export function createElement(tagName) {
  return svgTags[ tagName ]
    ? env.doc.createElementNS(namespaces.svg, tagName)
    : env.doc.createElement(tagName)
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

export function setProp(node, name, value) {
  object.set(node, name, value, env.FALSE)
}

export function removeProp(node, name) {
  setProp(node, name, is.string(node[ name ]) ? char.CHAR_BLANK : env.NULL)
}

export function setAttr(node, name, value) {
  let propName = attr2Prop[ name ]
  let isBoolean = is.boolean(node[ propName || name ])
  if (isBoolean) {
    value = value === env.TRUE || value === env.RAW_TRUE || value === name
  }
  // 比如 readonly
  if (propName || isBoolean) {
    setProp(node, propName || name, value)
  }
  else {
    if (string.has(name, char.CHAR_COLON)) {
      let parts = name.split(char.CHAR_COLON), ns = namespaces[ parts[ 0 ] ]
      if (ns) {
        node.setAttributeNS(ns, parts[ 1 ], value)
        return
      }
    }
    node.setAttribute(name, value)
  }
}

export function removeAttr(node, name) {
  if (attr2Prop[ name ]) {
    removeProp(node, attr2Prop[ name ])
  }
  else if (is.boolean(node[ name ])) {
    removeProp(node, name)
  }
  else {
    if (string.has(name, char.CHAR_COLON)) {
      let parts = name.split(char.CHAR_COLON), ns = namespaces[ parts[ 0 ] ]
      if (ns) {
        node.removeAttributeNS(ns, parts[ 1 ])
        return
      }
    }
    node.removeAttribute(name)
  }
}

export function before(parentNode, newNode, referenceNode) {
  if (referenceNode) {
    parentNode.insertBefore(newNode, referenceNode)
  }
  else {
    append(parentNode, newNode)
  }
}

export function append(parentNode, child) {
  parentNode.appendChild(child)
}

export function replace(parentNode, newNode, oldNode) {
  parentNode.replaceChild(newNode, oldNode)
}

export function remove(parentNode, child) {
  parentNode.removeChild(child)
}

export function parent(node) {
  return node.parentNode
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
  return content == env.NULL
    ? node.nodeValue
    : node.nodeValue = content
}

export function html(node, content) {
  return content == env.NULL
    ? node.innerHTML
    : node.innerHTML = content
}

export function component(element, component) {
  return isDef(component)
    ? element.component = component
    : element.component
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
