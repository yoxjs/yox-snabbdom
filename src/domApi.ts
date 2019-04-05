import isDef from 'yox-common/function/isDef'

import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as string from 'yox-common/util/string'
import * as object from 'yox-common/util/object'

const attr2Prop = {}
attr2Prop['for'] = 'htmlFor'
attr2Prop['value'] = 'value'
attr2Prop['class'] = 'className'
attr2Prop['style'] = 'style.cssText'
attr2Prop['nohref'] = 'noHref'
attr2Prop['noshade'] = 'noShade'
attr2Prop['noresize'] = 'noResize'
attr2Prop['readonly'] = 'readOnly'
attr2Prop['defaultchecked'] = 'defaultChecked'
attr2Prop['defaultmuted'] = 'defaultMuted'
attr2Prop['defaultselected'] = 'defaultSelected'

const svgTags = array.toObject(
  'svg,g,defs,desc,metadata,symbol,use,image,path,rect,circle,line,ellipse,polyline,polygon,text,tspan,tref,textpath,marker,pattern,clippath,mask,filter,cursor,view,animate,font,font-face,glyph,missing-glyph,foreignObject'.split(',')
)

const domain = 'http://www.w3.org/'
const namespaces = {
  svg: domain + '2000/svg',
  xlink: domain + '1999/xlink',
}

export function createElement(tagName: string): HTMLElement {
  return svgTags[tagName]
    ? env.doc.createElementNS(namespaces.svg, tagName)
    : env.doc.createElement(tagName)
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

export function setProp(node: HTMLElement, name: string, value: string | number | boolean) {
  object.set(node, name, value, env.FALSE)
}

export function removeProp(node: HTMLElement, name: string) {
  setProp(node, name, is.string(node[name]) ? char.CHAR_BLANK : env.NULL)
}

export function setAttr(node: HTMLElement, name: string, value: any) {

  // 判断 name 是 property 还是 attribute
  // 判断方式是，要么命中 attr2Prop 要么属性是布尔类型
  const propName = attr2Prop[name],
  isBoolean = is.boolean(node[propName || name])

  // 如果属性是布尔类型，则属性值只能是三种可能：
  // true 或 'true' 或 等于属性名，比如 checked="checked"
  if (isBoolean) {
    value = value === env.TRUE || value === env.RAW_TRUE || value === name
  }
  // 类似 name=“{{xx}}” 写了一个不存在的数据
  else if (value == env.NULL) {
    value = char.CHAR_BLANK
  }

  // 比如 readonly
  if (propName || isBoolean) {
    setProp(node, propName || name, value)
  }
  else {
    if (string.has(name, char.CHAR_COLON)) {
      const parts = name.split(char.CHAR_COLON), ns = namespaces[parts[0]]
      if (ns) {
        node.setAttributeNS(ns, parts[1], value)
        return
      }
    }
    node.setAttribute(name, value)
  }
}

export function removeAttr(node: HTMLElement, name: string) {
  if (attr2Prop[name]) {
    removeProp(node, attr2Prop[name])
  }
  else if (is.boolean(node[name])) {
    removeProp(node, name)
  }
  else {
    if (string.has(name, char.CHAR_COLON)) {
      const parts = name.split(char.CHAR_COLON), ns = namespaces[parts[0]]
      if (ns) {
        node.removeAttributeNS(ns, parts[1])
        return
      }
    }
    node.removeAttribute(name)
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
    ? char.CHAR_BLANK
    : tagName.toLowerCase()
}

export function children(node: Node) {
  return node.childNodes
}

export function text(node: HTMLElement, content?: string) {
  return content == env.NULL
    ? node.nodeValue
    : node.nodeValue = content
}

export function html(node: HTMLElement, content?: string) {
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
    const classes = element.className.split(char.CHAR_WHITESPACE)
    if (!array.has(classes, className)) {
      array.push(classes, className)
      element.className = array.join(classes, char.CHAR_WHITESPACE)
    }
  }
}

export function removeClass(element: HTMLElement, className: string) {
  const { classList } = element
  if (classList && classList.remove) {
    classList.remove(className)
  }
  else {
    const classes = element.className.split(char.CHAR_WHITESPACE)
    if (array.has(classes, className)) {
      array.remove(classes, className)
      element.className = array.join(classes, char.CHAR_WHITESPACE)
    }
  }
}


const components = {}

export function component(id, component) {
  return isDef(component)
    ? components[id] = component
    : components[id]
}


