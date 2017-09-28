
import * as is from 'yox-common/util/is'
import * as env from 'yox-common/util/env'
import * as array from 'yox-common/util/array'
import * as logger from 'yox-common/util/logger'

import getComponentByTag from './getComponentByTag'

function setRef(vnode, value) {
  let { ref, instance } = vnode
  if (ref) {
    let refs = instance.$refs || (instance.$refs = { })
    refs[ ref ] = value
  }
}

function createComponent(vnode) {

  let { el, tag, ref, component, instance } = vnode
  if (!component) {
    setRef(vnode, el)
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

          component = instance.create(
            options,
            {
              el,
              props: vnode.attrs,
              replace: env.TRUE,
            }
          )

          el = vnode.el = component.$el
          el[ key ] = component

          setRef(vnode, component)

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
  let { component, el, attrs } = vnode
  if (component) {
    component = vnode.el[ getComponentByTag(vnode.tag) ]
    if (component) {
      if (component.set) {
        setRef(vnode, component)
        component.set(attrs, env.TRUE)
      }
      else {
        component.vnode = vnode
      }
    }
  }
  else {
    setRef(vnode, el)
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
}
