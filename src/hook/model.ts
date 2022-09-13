import {
  Data,
  LazyValue,
} from 'yox-type/src/type'

import {
  VNode,
  ModelValue,
} from 'yox-type/src/vnode'

import {
  YoxInterface,
} from 'yox-type/src/yox'

import {
  DomApi,
} from 'yox-type/src/api'

import {
  DIRECTIVE_MODEL,
} from 'yox-config/src/config'

import debounce from 'yox-common/src/function/debounce'
import toString from 'yox-common/src/function/toString'

import * as is from 'yox-common/src/util/is'
import * as array from 'yox-common/src/util/array'
import * as constant from 'yox-common/src/util/constant'

import * as field from '../field'

interface NativeControl {

  set(node: HTMLElement, value: any): void

  sync(node: HTMLElement, keypath: string, context: YoxInterface): void

}

function debounceIfNeeded<T extends Function>(fn: T, lazy: LazyValue | void): T {
  // 应用 lazy
  return lazy && lazy !== constant.TRUE
    ? debounce(fn as Function, lazy) as any
    : fn
}

const inputControl: NativeControl = {
  set(node: HTMLInputElement, value: any) {
    node.value = toString(value)
  },
  sync(node: HTMLInputElement, keypath: string, context: YoxInterface) {
    context.set(keypath, node.value)
  },
},

radioControl: NativeControl = {
  set(node: HTMLInputElement, value: any) {
    node.checked = node.value === toString(value)
  },
  sync(node: HTMLInputElement, keypath: string, context: YoxInterface) {
    if (node.checked) {
      context.set(keypath, node.value)
    }
  },
},

checkboxControl: NativeControl = {
  set(node: HTMLInputElement, value: any) {
    node.checked = is.array(value)
      ? array.has(value, node.value, constant.FALSE)
      : !!value
  },
  sync(node: HTMLInputElement, keypath: string, context: YoxInterface) {
    const value = context.get(keypath)
    if (is.array(value)) {
      if (node.checked) {
        context.append(keypath, node.value)
      }
      else {
        context.removeAt(
          keypath,
          array.indexOf(value, node.value, constant.FALSE)
        )
      }
    }
    else {
      context.set(keypath, node.checked)
    }
  },
},

selectControl: NativeControl = {
  set(node: HTMLSelectElement, value: any) {

    const { multiple, options } = node

    for (let i = 0, length = options.length; i < length; i++) {
      if (multiple) {
        options[i].selected = array.has(value, options[i].value, constant.FALSE)
      }
      else if (options[i].value == value) {
        node.selectedIndex = i
        return
      }
    }

    if (!multiple) {
      node.selectedIndex = -1
    }

  },
  sync(node: HTMLSelectElement, keypath: string, context: YoxInterface) {
    const { multiple, options } = node
    if (multiple) {
      const values: string[] = []
      for (let i = 0, length = options.length; i < length; i++) {
        if (options[i].selected) {
          values.push(
            options[i].value
          )
        }
      }
      context.set(keypath, values)
    }
    else {
      context.set(
        keypath,
        options[node.selectedIndex].value
      )
    }
  },
}

function addModel(api: DomApi, element: HTMLElement | void, component: YoxInterface | void, data: Data, vnode: VNode) {

  let { context, model, lazy, nativeAttrs } = vnode,

  { keypath, value } = model as ModelValue,

  lazyValue = lazy && (lazy[DIRECTIVE_MODEL] || lazy[constant.EMPTY_STRING])

  if (component) {

    let viewBinding = component.$model as string,

    viewSyncing = debounceIfNeeded(
      function (newValue: any) {
        context.set(keypath, newValue)
      },
      lazyValue
    )

    component.watch(viewBinding, viewSyncing)

    data[field.MODEL_DESTROY] = function () {
      component.unwatch(viewBinding, viewSyncing)
      delete data[field.MODEL_DESTROY]
    }

  }
  else {

    let control = vnode.tag === 'select'
      ? selectControl
      : inputControl,

    // checkbox,radio,select 监听的是 change 事件
    eventName = constant.EVENT_CHANGE

    if (control === inputControl) {
      const type = nativeAttrs && nativeAttrs.type
      if (type === 'radio') {
        control = radioControl
      }
      else if (type === 'checkbox') {
        control = checkboxControl
      }
      // 如果是输入框，则切换成 model 事件
      // model 事件是个 yox-dom 实现的特殊事件
      // 不会在输入法组合文字过程中得到触发事件
      else if (lazyValue !== constant.TRUE) {
        eventName = constant.EVENT_MODEL
      }
    }

    const sync = debounceIfNeeded(
      function () {
        control.sync(element as HTMLElement, keypath, context)
      },
      lazyValue
    )

    api.on(element as HTMLElement, eventName, sync)

    control.set(element as HTMLElement, value)

    data[field.MODEL_CONTROL] = control
    data[field.MODEL_DESTROY] = function () {
      api.off(element as HTMLElement, eventName, sync)
      delete data[field.MODEL_DESTROY]
      delete data[field.MODEL_CONTROL]
    }

  }

}

export function afterCreate(api: DomApi, vnode: VNode) {

  const model = vnode.model
  if (model) {
    addModel(
      api,
      vnode.node as HTMLElement,
      vnode.component,
      vnode.data as Data,
      vnode
    )
  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const data = vnode.data as Data,

  newModel = vnode.model,

  oldModel = oldVNode.model

  if (newModel) {

    const element = vnode.node as HTMLElement,

    component = vnode.component

    if (!oldModel) {
      addModel(api, element, component, data, vnode)
    }
    else if (newModel.keypath !== oldModel.keypath) {
      data[field.MODEL_DESTROY]()
      addModel(api, element, component, data, vnode)
    }
    else {
      if (component) {
        component.set(component.$model as string, newModel.value)
      }
      else {
        const control = data[field.MODEL_CONTROL]
        if (control) {
          control.set(element, newModel.value)
        }
      }
    }

  }
  else if (oldModel) {
    data[field.MODEL_DESTROY]()
  }

}

export function beforeDestroy(api: DomApi, vnode: VNode) {
  const data = vnode.data as Data, destroy = data[field.MODEL_DESTROY]
  if (destroy) {
    destroy()
  }
}
