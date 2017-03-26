
import * as object from 'yox-common/util/object'

/**
 * @param {?HTMLElement} options.el
 * @param {?string} options.sel
 * @param {?Object} options.data
 * @param {?string} options.text
 * @param {?Array} options.children
 */
export default class Vnode {
  constructor(options) {
    object.extend(this, options)
  }
}

Vnode.SEL_COMMENT = '!'
