
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

  let { el, component, instance, ref } = vnode

  if (component) {
    el = this.getComponent(el)
    el.set(vnode.attrs)
  }

  if (oldVnode && oldVnode.ref !== ref) {
    removeRef(instance, oldVnode.ref)
    setRef(instance, ref, el)
  }

}

function destroyComponent(vnode) {
  let { el, component, instance, ref } = vnode
  // 不加 component 会产生递归
  // 因为组件元素既是父组件中的一个子元素，也是组件自己的根元素
  // 因此该元素会产生两个 vnode
  if (component) {
    this.getComponent(el).destroy()
  }
  removeRef(instance, ref)
}

export default {
  create: createComponent,
  postpatch: updateComponent,
  destroy: destroyComponent,
}
