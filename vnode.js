
import * as object from 'yox-common/util/object'

/**
 * @param {?string} options.el
 * @param {?string} options.sel
 * @param {?string} options.data
 * @param {?string} options.text
 * @param {?string} options.html
 * @param {?string|Array} options.children
 */
export default class Vnode {
  constructor(options) {
    object.extend(this, options)
  }
}
