
import * as is from 'yox-common/util/is'
import * as array from 'yox-common/util/array'

import VNode from './VNode'

export default function (sel, data) {

  let children, text

  let lastArg = array.last(arguments)
  if (is.array(lastArg)) {
    children = lastArg
    array.each(
      children,
      function (child, i) {
        if (!(child instanceof VNode)) {
          children[i] = new VNode(env.UNDEFINED, env.UNDEFINED, env.UNDEFINED, child)
        }
      }
    )
  }
  else if (is.string(lastArg)) {
    text = lastArg
  }

  if (!is.object(data)) {
    data = { }
  }

  return new VNode(sel, data, children, text)

}
