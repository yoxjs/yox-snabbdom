
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as object from 'yox-common/util/object'

function toProps(attrs) {
  let props = { }
  if (attrs) {
    object.each(
      attrs,
      function (item) {
        props[ item.name ] = item.value
      }
    )
  }
  return props
}

function createComponent(oldVnode, vnode) {

  let { component, instance, attrs } = vnode.data
  if (!component) {
    return
  }

  let { el } = vnode

  el.$component = {
    queue: [ ],
    attrs,
  }

  instance.component(
    vnode.sel,
    function (options) {
      let { $component } = el
      if ($component && is.array($component.queue)) {

        let component = instance.create(
          options,
          {
            el,
            props: toProps($component.attrs),
            replace: env.TRUE,
          }
        )

        el = component.$el;
        el.$component = component
        vnode.el = el

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
      $component.set(
        toProps(attrs),
        env.TRUE
      )
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
