
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as logger from 'yox-common/util/logger'

function createComponent(vnode) {

  let { el, tag, attrs, component, instance } = vnode
  if (!component) {
    return
  }

  el.$component = {
    queue: [ ],
    attrs,
  }

  instance.component(
    tag,
    function (options) {
      if (!options) {
        logger.fatal(`"${tag}" component is not found.`)
      }
      let { $component } = el, { queue, attrs } = $component
      if ($component && is.array(queue)) {

        component = instance.create(
          options,
          {
            el,
            props: attrs,
            replace: env.TRUE,
          }
        )

        el = vnode.el = component.$el
        el.$component = component

        array.each(
          queue,
          function (callback) {
            callback(component)
          }
        )

      }
    }
  )
}

function updateComponent(vnode) {
  let { el, attrs, component } = vnode, { $component } = el
  if (component && $component) {
    if ($component.set) {
      $component.set(attrs, env.TRUE)
    }
    else {
      $component.attrs = attrs
    }
  }
}

function destroyComponent(vnode) {
  let { el, component } = vnode, { $component } = el
  // 不加 component 会产生递归
  // 因为组件元素既是父组件中的一个子元素，也是组件自己的根元素
  // 因此该元素会产生两个 vnode
  if (component && $component) {
    if ($component.destroy) {
      $component.destroy()
    }
    el.$component = env.NULL
  }
}

export default {
  create: createComponent,
  update: updateComponent,
  destroy: destroyComponent,
}
