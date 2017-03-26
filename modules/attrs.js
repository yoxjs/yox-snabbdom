
import * as env from 'yox-common/util/env'
import * as char from 'yox-common/util/char'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'
import * as string from 'yox-common/util/string'

const booleanLiteral = 'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,draggable,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,spellcheck,translate,truespeed,typemustmatch,visible'

const booleanMap = array.toObject(
  string.split(booleanLiteral, char.CHAR_COMMA)
)

function updateAttrs(oldVnode, vnode) {

  let oldAttrs = oldVnode.data.attrs
  let newAttrs = vnode.data.attrs

  if (!oldAttrs && !newAttrs) {
    return
  }

  oldAttrs = oldAttrs || { }
  newAttrs = newAttrs || { }

  let { el } = vnode
  let api = this

  let getValue = function (attrs, name) {
    // 类似 <input disabled>
    // 没写 value 默认是 disabled="disabled"
    // 考虑到有些人喜欢写 disabled="true"
    // 这里一并兼容了，如果有 value，不管是啥都当做 name 处理
    if (object.has(attrs, name)) {
      let value = attrs[ name ]
      if (booleanMap[ name ]) {
        return (value === env.UNDEFINED || value) ? name : env.FALSE
      }
      return value
    }
  }

  object.each(
    newAttrs,
    function (value, name) {
      value = getValue(newAttrs, name)
      if (value !== getValue(oldAttrs, name)) {
        if (value === env.FALSE) {
          api.removeAttr(el, name)
        }
        else {
          api.setAttr(el, name, value)
        }
      }
    }
  )

  object.each(
    oldAttrs,
    function (value, name) {
      if (!object.has(newAttrs, name)) {
        api.removeAttr(el, name)
      }
    }
  )

}

export default {
  create: updateAttrs,
  update: updateAttrs,
}
