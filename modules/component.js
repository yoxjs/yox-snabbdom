
import * as config from 'yox-config'
import * as env from 'yox-common/util/env'
import * as object from 'yox-common/util/object'

function setRef(instance, ref, value) {
  if (ref) {
    // 为了避免相同的组件，因为切换位置
    // 出现在前面创建，却在后面删除的情况
    // 这里我们设计了一种机制，即在更新视图前，给 instance 设置了一个全新的对象 $flags
    // 任何有类似需求的地方，可以往这个对象存一些标识
    let refs = instance.$refs || (instance.$refs = { })
    refs[ ref ] = value
    instance.$flags[ ref ] = env.TRUE
  }
}

function removeRef(instance, ref) {
  // 不是本次更新视图新增的
  if (ref && !instance.$flags[ ref ]) {
    delete instance.$refs[ ref ]
  }
}

function createComponent(vnode) {
  let el = vnode.el
  if (vnode[ env.RAW_COMPONENT ]) {
    el = this[ env.RAW_COMPONENT ](vnode.data.id)
  }
  setRef(vnode.instance, vnode[ env.RAW_REF ], el)
}

function updateComponent(vnode, oldVnode) {

  let el = vnode.el,
  attrs = vnode.attrs,
  model = vnode.model,
  instance = vnode.instance,
  ref = vnode[ env.RAW_REF ]

  if (vnode[ env.RAW_COMPONENT ]) {
    el = this[ env.RAW_COMPONENT ](vnode.data.id)
    if (attrs) {
      // 如果有双向绑定，要把它的值取出来放进 attrs
      let modelField = el.$model
      if (model && modelField && !object.has(attrs, modelField)) {
        attrs[ modelField ] = instance.get(model)
      }
      el.set(el.checkPropTypes(attrs))
    }
    el.set(vnode.slots)
  }

  if (oldVnode && oldVnode[ env.RAW_REF ] !== ref) {
    removeRef(instance, oldVnode[ env.RAW_REF ])
    setRef(instance, ref, el)
  }

}

function destroyComponent(vnode) {
  removeRef(vnode.instance, vnode[ env.RAW_REF ])
}

export default {
  create: createComponent,
  postpatch: updateComponent,
  destroy: destroyComponent,
}
