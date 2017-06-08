
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'
import * as logger from 'yox-common/util/logger'

function bindDirective(vnode, key) {

  let { el, attrs, directives, component, instance } = vnode

  let node = directives[ key ],
  options = {
    el,
    node,
    instance,
    directives,
    attrs: attrs || { },
  }

  let { $component } = el
  if (component && is.object($component)) {
    if (object.has($component, 'queue')
      && !object.has($component, 'set')
    ) {
      $component = $component.queue
    }
    options.component = $component
  }

  let bind = instance.directive(node.name)
  if (!is.func(bind)) {
    logger.fatal(`Directive [${node.name}] is not found.`)
  }

  let unbind = bind(options)
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

  let unbinds

  object.each(
    newDirectives,
    function (directive, key) {
      let unbind
      if (object.has(oldDirectives, key)) {
        let oldDirective = oldDirectives[ key ]
        if (directive.context.get(directive.value).keypath
          !== oldDirective.context.get(oldDirective.value).keypath
        ) {
          unbindDirective(oldVnode, key)
          unbind = bindDirective(vnode, key)
        }
      }
      else {
        unbind = bindDirective(vnode, key)
      }
      if (unbind) {
        if (!unbinds) {
          unbinds = { }
        }
        unbinds[ key ] = unbind
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
  if (oldUnbinds && unbinds) {
    object.extend(unbinds, oldUnbinds)
  }

  if (unbinds) {
    vnode.unbinds = unbinds
  }

}

function destroyDirectives(vnode) {
  let { unbinds } = vnode
  if (unbinds) {
    object.each(
      unbinds,
      function (destroy) {
        destroy()
      }
    )
  }
}

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: destroyDirectives,
}
