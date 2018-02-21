
import * as config from 'yox-config'

function setRef(instance, ref, value) {
  if (ref) {
    let refs = instance.$refs || (instance.$refs = { })
    refs[ ref ] = value
  }
}

function removeRef(instance, ref) {
  if (ref) {
    delete instance.$refs[ ref ]
  }
}

function createComponent(vnode) {
  let { el, component, instance, ref } = vnode
  if (component) {
    el = this.getComponent(el)
  }
  setRef(instance, ref, el)
}

function updateComponent(vnode, oldVnode) {

  let { el, component, children, instance, ref } = vnode

  if (component) {
    el = this.getComponent(el)
    el.set(vnode.attrs)
    el.set(vnode.slots)
  }

  if (oldVnode && oldVnode.ref !== ref) {
    removeRef(instance, oldVnode.ref)
    setRef(instance, ref, el)
  }

}

function destroyComponent(vnode) {
  removeRef(vnode.instance, vnode.ref)
}

export default {
  create: createComponent,
  postpatch: updateComponent,
  destroy: destroyComponent,
}
