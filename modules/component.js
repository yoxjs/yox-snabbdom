
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

function createComponent(oldVnode, vnode) {

  let { el, component } = vnode
  if (!component) {
    return
  }

  let { instance, attrs } = vnode.data
  el.$component = {
    queue: [ ],
    attrs,
  }

  instance.component(
    vnode.sel,
    function (options) {
      let { $component } = el
      if ($component && is.array($component.queue)) {

        component = instance.create(
          options,
          {
            el,
            props: $component.attrs,
            replace: env.TRUE,
          }
        )

        el = vnode.el = component.$el;
        el.$component = component

        array.each(
          $component.queue,
          function (callback) {
            callback(component)
          }
        )

      }
    }
  )
}

function updateComponent(oldVnode, vnode) {
  let { $component } = vnode.el
  if (is.object($component)) {
    let { attrs } = vnode.data
    if ($component.set) {
      $component.set(attrs, env.TRUE)
    }
    else {
      $component.attrs = attrs
    }
  }
}

function destroyComponent(oldVnode, vnode) {
  let { el } = oldVnode
  let { $component } = el
  if (is.object($component)) {
    if ($component.destroy) {
      $component.destroy(env.TRUE)
    }
    el.$component = env.NULL
  }
}

export default {
  create: createComponent,
  update: updateComponent,
  destroy: destroyComponent,
}
