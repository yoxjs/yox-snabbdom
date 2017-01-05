
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

const booleanLiteral = 'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare'
  + 'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,draggable'
  + 'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple'
  + 'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly'
  + 'required,reversed,scoped,seamless,selected,sortable,spellcheck,translate'
  + 'truespeed,typemustmatch,visible'

const booleanMap = array.toObject(booleanAttrs.split(','))

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (!oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { elm } = vnode

  object.each(
    newAttrs,
    function (newValue, name) {
      if (newValue !== oldAttrs[name]) {
        if (!newValue && booleanMap[name]) {
          elm.removeAttribute(name)
        }
        else {
          elm.setAttribute(name, newValue)
        }
      }
    }
  )

  object.each(
    oldAttrs,
    function (oldValue, name) {
      if (!object.has(newAttrs, name)) {
        elm.removeAttribute(name)
      }
    }
  )

}

export default {
  create: updateAttrs,
  update: updateAttrs,
}
