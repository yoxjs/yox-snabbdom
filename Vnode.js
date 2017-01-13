
import * as object from 'yox-common/util/object'

/**
 * @param {?string} options.el
 * @param {?string} options.sel
 * @param {?string} options.data
 * @param {?string} options.text
 * @param {?string} options.html
 * @param {?string|Array} options.children
 */
class Vnode {
  constructor(options) {
    object.extend(this, options)
  }
}

Vnode.SEL_COMMENT = '!'

export default Vnode
