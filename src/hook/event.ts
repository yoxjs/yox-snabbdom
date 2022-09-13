import {
  Data,
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

import * as constant from 'yox-common/src/util/constant'

import * as field from '../field'

function addEvent(api: DomApi, element: HTMLElement | void, component: YoxInterface | void, data: Data, key: string, lazy: Record<string, LazyValue> | void, event: EventValue) {

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

  data[field.EVENT_DESTROY + key] = function () {
    api.off(element as HTMLElement, key, listener)
    delete data[field.EVENT_DESTROY + key]
  }

}

export function afterCreate(api: DomApi, vnode: VNode) {

  const { events } = vnode
  if (events) {

    const element = vnode.node as HTMLElement,

    component = vnode.component,

    lazy = vnode.lazy,

    data = vnode.data as Data

    for (let key in events) {
      addEvent(api, element, component, data, key, lazy, events[key])
    }

  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newEvents = vnode.events, oldEvents = oldVNode.events
  if (newEvents !== oldEvents) {

    const element = vnode.node as HTMLElement,

    component = vnode.component,

    lazy = vnode.lazy,

    data = vnode.data as Data

    if (newEvents) {
      const oldValue = oldEvents || constant.EMPTY_OBJECT
      for (let key in newEvents) {

        const event = newEvents[key], oldEvent = oldValue[key]

        if (!oldEvent) {
          addEvent(api, element, component, data, key, lazy, event)
        }
        else if (event.value !== oldEvent.value) {
          const destroy = data[field.EVENT_DESTROY + key]
          if (destroy) {
            destroy()
          }
          addEvent(api, element, component, data, key, lazy, event)
        }
        else if (oldEvent.runtime && event.runtime) {
          oldEvent.runtime.execute = event.runtime.execute
          event.runtime = oldEvent.runtime
        }

      }
    }

    if (oldEvents) {
      const newValue = newEvents || constant.EMPTY_OBJECT
      for (let key in oldEvents) {
        if (!newValue[key]) {
          const destroy = data[field.EVENT_DESTROY + key]
          if (destroy) {
            destroy()
          }
        }
      }
    }

  }

}

export function beforeDestroy(api: DomApi, vnode: VNode) {

  const events = vnode.events, data = vnode.data as Data
  if (events) {
    for (let key in events) {
      const destroy = data[field.EVENT_DESTROY + key]
      if (destroy) {
        destroy()
      }
    }
  }

}
