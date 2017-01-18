
import * as is from 'yox-common/util/is'
import * as array from 'yox-common/util/array'

import Vnode from './Vnode'

export default function (sel, data) {

  let children, text

  let args = arguments
  let lastArg = array.last(args)
  if (is.array(lastArg)) {
    children = lastArg
    array.each(
      children,
      function (child, i) {
        if (!(child instanceof Vnode)) {
          children[ i ] = new Vnode({
            text: child,
          })
        }
      }
    )
  }
  else if (is.string(lastArg) && args.length > 1) {
    text = lastArg
  }

  return new Vnode({
    sel,
    text,
    children,
    data: is.object(data) ? data : { },
  })

}
