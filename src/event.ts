import {
  LazyValue,
} from 'yox-type/src/type'

import {
  ThisListenerOptions,
} from 'yox-type/src/options'

import {
  YoxInterface,
  CustomEventInterface,
} from 'yox-type/src/yox'

import {
  VNode,
  EventValue,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import debounce from 'yox-common/src/function/debounce'
import CustomEvent from 'yox-common/src/util/CustomEvent'

import * as constant from 'yox-common/src/util/constant'

import * as field from './field'

function addEvent(api: DomApi, element: HTMLElement | void, component: YoxInterface | void, lazy: Record<string, LazyValue> | void, event: EventValue) {

  let { ns, name, listener, isNative } = event

  if (lazy) {

    const value = lazy[name] || lazy[constant.EMPTY_STRING]

    if (value === constant.TRUE) {
      name = constant.EVENT_CHANGE
    }
    else if (value > 0) {
      listener = debounce(
        listener,
        value,
        // 避免连续多次点击，主要用于提交表单场景
        // 移动端的 tap 事件可自行在业务层打补丁实现
        name === constant.EVENT_CLICK || name === constant.EVENT_TAP
      )
    }

  }

  if (component) {

    if (isNative) {
      const target = component.$el as HTMLElement
      api.on(target, name, listener)
      return function () {
        api.off(target, name, listener)
      }
    }

    const options: ThisListenerOptions = {
      ns: ns || constant.EMPTY_STRING,
      listener(event: CustomEventInterface, data: any) {
        // 监听组件事件不用处理父组件传下来的事件
        if (event.phase !== CustomEvent.PHASE_DOWNWARD) {
          return listener(event, data)
        }
      },
    }
    component.on(name, options)
    return function () {
      component.off(name, options)
    }

  }

  api.on(element as HTMLElement, name, listener)
  return function () {
    api.off(element as HTMLElement, name, listener)
  }
}

export function update(api: DomApi, vnode: VNode, oldVnode?: VNode) {

  const { data, lazy, events } = vnode,

  oldEvents = oldVnode && oldVnode.events

  if (events || oldEvents) {

    const element = vnode.node as HTMLElement,

    component = data[field.COMPONENT],

    listeners = data[field.EVENT] || (data[field.EVENT] = {}),

    isKeypathChange = oldVnode && vnode.keypath !== oldVnode.keypath,

    newValue = events || constant.EMPTY_OBJECT,

    oldValue = oldEvents || constant.EMPTY_OBJECT

    if (events) {
      for (let name in events) {

        const event = events[name], { key } = event

        if (!oldValue[name]) {
          listeners[key] = addEvent(api, element, component, lazy, event)
        }
        else if (event.value !== oldValue[name].value || isKeypathChange) {
          listeners[key]()
          listeners[key] = addEvent(api, element, component, lazy, event)
        }

      }
    }

    if (oldEvents) {
      for (let name in oldEvents) {
        if (!newValue[name]) {
          const { key } = oldEvents[name]
          listeners[key]()
          delete listeners[key]
        }
      }
    }

  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { data, events } = vnode, listeners = data[field.EVENT]
  if (events && listeners) {
    for (let name in events) {
      const { key } = events[name]
      listeners[key]()
      delete listeners[key]
    }
  }
}
