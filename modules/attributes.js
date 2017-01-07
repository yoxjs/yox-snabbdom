
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

const booleanLiteral = 'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare'
  + 'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,draggable'
  + 'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple'
  + 'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly'
  + 'required,reversed,scoped,seamless,selected,sortable,spellcheck,translate'
  + 'truespeed,typemustmatch,visible'

const booleanMap = array.toObject(booleanAttrs.split(char.CHAR_COMMA))

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (!oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { el } = vnode

  object.each(
    newAttrs,
    function (value, name) {
      if (value !== oldAttrs[name]) {
        if (!value && booleanMap[name]) {
          el.removeAttribute(name)
        }
        else {
          el.setAttribute(name, value)
        }
      }
    }
  )

  object.each(
    oldAttrs,
    function (value, name) {
      if (!object.has(newAttrs, name)) {
        el.removeAttribute(name)
      }
    }
  )

}

export default {
  create: updateAttrs,
  update: updateAttrs,
}
