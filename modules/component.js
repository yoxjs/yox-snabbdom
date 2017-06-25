
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as logger from 'yox-common/util/logger'

function getComponentByTag(tag) {
  return `component${tag}`
}

function createComponent(vnode) {

  let { el, tag, component, instance } = vnode
  if (!component) {
    return
  }

  let key = getComponentByTag(tag)
  el[ key ] = {
    queue: [ ],
    vnode,
  }

  instance.component(
    tag,
    function (options) {
      if (!options) {
        logger.fatal(`"${tag}" component is not found.`)
      }
      component = el[ key ]
      if (component) {
        let { queue, vnode } = component
        if (is.array(queue)) {
          let { attrs, children } = vnode
          if (children) {
            attrs = attrs || { }
            attrs.$children = children
          }

          component = instance.create(
            options,
            {
              el,
              props: attrs,
              replace: env.TRUE,
            }
          )

          el = vnode.el = component.$el
          el[ key ] = component

          array.each(
            queue,
            function (callback) {
              callback(component)
            }
          )
        }
      }
    }
  )
}

function updateComponent(vnode) {
  let { component, attrs, children } = vnode
  if (component) {
    component = vnode.el[ getComponentByTag(vnode.tag) ]
    if (component) {
      if (component.set) {
        if (children) {
          attrs = attrs || { }
          attrs.$children = children
        }
        component.set(attrs, env.TRUE)
      }
      else {
        component.vnode = vnode
      }
    }
  }
}

function destroyComponent(vnode) {
  let { el, component } = vnode
  // 不加 component 会产生递归
  // 因为组件元素既是父组件中的一个子元素，也是组件自己的根元素
  // 因此该元素会产生两个 vnode
  if (component) {
    let key = getComponentByTag(vnode.tag)
    component = el[ key ]
    if (component) {
      if (component.destroy) {
        component.destroy()
      }
      el[ key ] = env.NULL
    }
  }
}

export default {
  create: createComponent,
  postpatch: updateComponent,
  destroy: destroyComponent,
  getComponentByTag,
}
