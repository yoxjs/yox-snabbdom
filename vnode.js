
import * as object from 'yox-common/util/object'

export default class VNode(sel, data, children, text, elm) {
  this.sel = sel
  this.data = data
  this.children = children
  this.text = text
  this.elm = elm
  if (data && object.has(data, 'key')) {
    this.key = data.key
  }
}
