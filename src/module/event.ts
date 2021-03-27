import {
  LazyValue,
} from 'yox-type/src/type'

import {
  ThisListenerOptions,
} from 'yox-type/src/options'

import {
  YoxInterface,
} from 'yox-type/src/yox'

import {
  VNode,
  EventValue,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import debounce from 'yox-common/src/function/debounce'

import * as object from 'yox-common/src/util/object'
import * as constant from 'yox-common/src/util/constant'

import * as field from '../field'

function addEvent(api: DomApi, element: HTMLElement | void, component: YoxInterface | void, lazy: Record<string, LazyValue> | void, event: EventValue) {

  let { name, listener } = event

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

    if (event.isNative) {
      const target = component.$el as HTMLElement
      api.on(target, name, listener)
      return function () {
        api.off(target, name, listener)
      }
    }

    // event 有 ns 和 listener 两个字段，满足 ThisListenerOptions 的要求
    component.on(name, event as ThisListenerOptions)
    return function () {
      component.off(name, event as ThisListenerOptions)
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

    component = vnode.component,

    destroy = data[field.EVENT] || (data[field.EVENT] = { })

    if (events) {
      const oldValue = oldEvents || constant.EMPTY_OBJECT
      for (let key in events) {

        const event = events[key], oldEvent = oldValue[key]

        if (!oldEvent) {
          destroy[key] = addEvent(api, element, component, lazy, event)
        }
        else if (event.value !== oldEvent.value) {
          destroy[key]()
          destroy[key] = addEvent(api, element, component, lazy, event)
        }
        else if (oldEvent.runtime && event.runtime) {
          object.extend(oldEvent.runtime, event.runtime)
          // 在当前节点传递 oldEvent.runtime 的引用
          event.runtime = oldEvent.runtime
        }

      }
    }

    if (oldEvents) {
      const newValue = events || constant.EMPTY_OBJECT
      for (let key in oldEvents) {
        if (!newValue[key]) {
          destroy[key]()
          delete destroy[key]
        }
      }
    }

  }

}

export function remove(api: DomApi, vnode: VNode) {
  const { data, events } = vnode, destroy = data[field.EVENT]
  if (events && destroy) {
    for (let key in events) {
      destroy[key]()
      delete destroy[key]
    }
  }
}
