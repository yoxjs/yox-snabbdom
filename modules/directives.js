
import execute from 'yox-common/function/execute'

import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

import executeExpression from 'yox-expression-compiler/execute'

function bindDirective(vnode, key) {

  let { el, component } = vnode
  let { instance, attrs, directives, destroies } = vnode.data

  let node = directives[ key ]

  let args = {
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
    args.component = $component
  }

  let destroy = execute(
    instance.directive(node.name),
    instance,
    args
  )

  if (is.func(destroy)) {
    if (!destroies) {
      destroies = vnode.data.destroies = { }
    }
    destroies[ key ] = destroy
  }

}

function unbindDirective(vnode, key) {
  let { destroies } = vnode.data
  if (destroies && destroies[ key ]) {
    destroies[ key ]()
    delete destroies[ key ]
  }
}

function executeDirective(directive) {
  let { expr, context } = directive
  if (expr) {
    return executeExpression(
      expr,
      function (key) {
        return context.get(key).value
      }
    )
  }
}

function updateDirectives(oldVnode, vnode) {

  let oldDirectives = oldVnode.data.directives
  let newDirectives = vnode.data.directives

  if (!oldDirectives && !newDirectives) {
    return
  }

  oldDirectives = oldDirectives || { }
  newDirectives = newDirectives || { }

  object.each(
    newDirectives,
    function (directive, key) {
      if (object.has(oldDirectives, key)) {
        let oldDirective = oldDirectives[ key ]
        if (oldDirective.value !== directive.value
          || oldDirective.keypath !== directive.keypath
          || oldDirective.context.get(env.THIS).value !== directive.context.get(env.THIS).value
          || executeDirective(oldDirective) !== executeDirective(directive)
        ) {
          unbindDirective(oldVnode, key)
          bindDirective(vnode, key)
        }
      }
      else {
        bindDirective(vnode, key)
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

  vnode.data.destroies = object.extend(
    { },
    oldVnode.data.destroies,
    vnode.data.destroies
  )

}

function destroyDirectives(vnode) {
  let { destroies } = vnode.data
  if (destroies) {
    object.each(
      destroies,
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
