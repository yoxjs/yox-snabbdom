
import * as is from 'yox-common/util/is'
import * as object from 'yox-common/util/object'

function bindDirective(vnode, key, api) {

  let { el, tag, attrs, directives, component, instance } = vnode

  let node = directives[ key ],
  options = {
    el,
    node,
    instance,
    directives,
    attrs: attrs || { },
  }

  if (component) {
    options.component = api.getComponent(el)
  }

  let bind = instance.directive(node.name),
  unbind = bind && bind(options)

  if (is.func(unbind)) {
    return unbind
  }

}

function unbindDirective(vnode, key) {
  let { unbinds } = vnode
  if (unbinds && unbinds[ key ]) {
    unbinds[ key ]()
    delete unbinds[ key ]
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

  let api = this, newUnbinds

  object.each(
    newDirectives,
    function (directive, key) {
      let unbind
      if (object.has(oldDirectives, key)) {
        let oldDirective = oldDirectives[ key ]
        if (directive.value !== oldDirective.value
          || directive.keypath !== oldDirective.keypath
          || directive.context.data !== oldDirective.context.data
        ) {
          unbindDirective(oldVnode, key)
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
      if (!object.has(newDirectives, key)) {
        unbindDirective(oldVnode, key)
      }
    }
  )

  let oldUnbinds = oldVnode && oldVnode.unbinds
  if (oldUnbinds) {
    if (newUnbinds) {
      object.extend(newUnbinds, oldUnbinds)
    }
    else {
      newUnbinds = oldUnbinds
    }
  }

  if (newUnbinds) {
    vnode.unbinds = newUnbinds
  }

}

function destroyDirectives(vnode) {
  let { unbinds } = vnode
  if (unbinds) {
    object.each(
      unbinds,
      function (unbind) {
        unbind()
      }
    )
  }
}

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: destroyDirectives,
}
