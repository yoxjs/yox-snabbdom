
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

export default class VNode(sel, data, children, text, el) {
  this.sel = sel
  this.data = data
  this.children = children
  this.text = text
  this.el = el
  this.key = data && object.has(data, 'key') ? data.key : env.UNDEFINED
}
