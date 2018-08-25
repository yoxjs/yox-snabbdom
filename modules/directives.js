
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

function bindDirective(vnode, key, api) {

  let { directives, instance } = vnode

  let node = directives[ key ],
  options = {
    el: vnode.el,
    node,
    instance,
    directives,
    attrs: vnode.attrs || { },
  }

  if (vnode[ env.RAW_COMPONENT ]) {
    options[ env.RAW_COMPONENT ] = api[ env.RAW_COMPONENT ](vnode.data.id)
  }

  let bind = instance.directive(node[ env.RAW_NAME ]),
  unbind = bind && bind(options)

  if (is.func(unbind)) {
    return unbind
  }

}

function updateDirectives(vnode, oldVnode) {

  let newDirectives = vnode.directives
  let oldDirectives = oldVnode && oldVnode.directives

  if (!newDirectives && !oldDirectives) {
    return
  }

  newDirectives = newDirectives || { }
  oldDirectives = oldDirectives || { }

  let api = this, data = vnode.data, oldUnbinds = data.unbinds, newUnbinds

  object.each(
    newDirectives,
    function (directive, key) {
      let unbind
      if (object.has(oldDirectives, key)) {
        let oldDirective = oldDirectives[ key ]
        if (directive[ env.RAW_VALUE ] !== oldDirective[ env.RAW_VALUE ]
          || directive[ env.RAW_KEYPATH ] !== oldDirective[ env.RAW_KEYPATH ]
        ) {
          if (oldUnbinds && oldUnbinds[ key ]) {
            oldUnbinds[ key ]()
            delete oldUnbinds[ key ]
          }
          unbind = bindDirective(vnode, key, api)
        }
      }
      else {
        unbind = bindDirective(vnode, key, api)
      }
      if (unbind) {
        (newUnbinds || (newUnbinds = { }))[ key ] = unbind
      }
    }
  )

  object.each(
    oldDirectives,
    function (directive, key) {
      if (!object.has(newDirectives, key)
        && oldUnbinds
        && oldUnbinds[ key ]
      ) {
        oldUnbinds[ key ]()
        delete oldUnbinds[ key ]
      }
    }
  )

  if (newUnbinds) {
    if (oldUnbinds) {
      object.extend(oldUnbinds, newUnbinds)
    }
    else {
      data.unbinds = newUnbinds
    }
  }

}

function destroyDirectives(vnode) {
  let { unbinds } = vnode.data
  if (unbinds) {
    object.each(
      unbinds,
      function (unbind, key) {
        unbind()
        delete unbinds[ key ]
      }
    )
  }
}

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: destroyDirectives,
}
