import {
  Watcher,
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

  name: string

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
  name: 'value'
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
  name: 'checked'
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
  name: 'checked'
},

selectControl: NativeControl = {
  set(node: HTMLSelectElement, value: any) {
    array.each(
      array.toArray(node.options),
      node.multiple
        ? function (option) {
          option.selected = array.has(value, option.value, constant.FALSE)
        }
        : function (option, index) {
          if (option.value == value) {
            node.selectedIndex = index
            return constant.FALSE
          }
        }
    )
  },
  sync(node: HTMLSelectElement, keypath: string, context: YoxInterface) {
    const { options } = node
    if (node.multiple) {
      const values: string[] = []
      array.each(
        array.toArray(options),
        function (option) {
          if (option.selected) {
            array.push(
              values,
              option.value
            )
          }
        }
      )
      context.set(keypath, values)
    }
    else {
      context.set(
        keypath,
        options[node.selectedIndex].value
      )
    }
  },
  name: 'value'
}

export function addModel(api: DomApi, element: HTMLElement | void, component: YoxInterface | void, vnode: VNode) {

  let { context, model, lazy, nativeProps } = vnode,

  { keypath, value } = model as ModelValue,

  lazyValue = lazy && (lazy[DIRECTIVE_MODEL] || lazy[constant.EMPTY_STRING]),

  update: Watcher | void,

  destroy: Function

  if (component) {

    let viewBinding = component.$model as string,

    viewSyncing = debounceIfNeeded(
      function (newValue: any) {
        context.set(keypath, newValue)
      },
      lazyValue
    )

    update = function (newValue: any) {
      if (update) {
        component.set(viewBinding, newValue)
      }
    }

    destroy = function () {
      component.unwatch(viewBinding, viewSyncing)
    }

    component.watch(viewBinding, viewSyncing)

  }
  else {

    let control = vnode.tag === 'select'
      ? selectControl
      : inputControl,

    // checkbox,radio,select 监听的是 change 事件
    eventName = constant.EVENT_CHANGE

    if (control === inputControl) {
      const type = nativeProps && nativeProps.type
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

    update = function (newValue: any) {
      if (update) {
        control.set(element as HTMLElement, newValue)
      }
    }

    const sync = debounceIfNeeded(
      function () {
        control.sync(element as HTMLElement, keypath, context)
      },
      lazyValue
    )

    destroy = function () {
      api.off(element as HTMLElement, eventName, sync)
    }

    api.on(element as HTMLElement, eventName, sync)

    control.set(element as HTMLElement, value)

  }

  // 监听数据，修改界面
  context.watch(keypath, update as Watcher)

  return function () {
    context.unwatch(keypath, update as Watcher)
    update = constant.UNDEFINED
    destroy()
  }

}


export function update(api: DomApi, vnode: VNode, oldVNode?: VNode) {

  const { data, node, component, model } = vnode,

  oldModel = oldVNode && oldVNode.model

  if (model) {
    if (!oldModel) {
      data[field.MODEL] = addModel(api, node as HTMLElement, component, vnode)
    }
    else if (model.keypath !== oldModel.keypath) {
      data[field.MODEL]()
      data[field.MODEL] = addModel(api, node as HTMLElement, component, vnode)
    }
  }
  else if (oldModel) {
    data[field.MODEL]()
    delete data[field.MODEL]
  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { data } = vnode
  if (data[field.MODEL]) {
    data[field.MODEL]()
    delete data[field.MODEL]
  }
}
