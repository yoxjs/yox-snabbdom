
import * as object from 'yox-common/util/object'

export default function Vnode(sel, text, data, children, key, component) {
  return {
    sel,
    text,
    data,
    children,
    key,
    component
  }
}


Vnode.is = function (target) {
  return object.has(target, 'sel')
}
