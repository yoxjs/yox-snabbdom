import {
  Data,
} from 'yox-type/src/type'

import {
  VNode,
  Directive,
} from 'yox-type/src/vnode'

import {
  DomApi,
} from 'yox-type/src/api'

import * as constant from 'yox-common/src/util/constant'
import { DIRECTIVE_HOOKS, DIRECTIVE_UPDATING } from '../field'

function callDirectiveCreate(data: Data, vnode: VNode, directive: Directive) {
  data[DIRECTIVE_HOOKS + directive.name] = directive.create(
    vnode.component || (vnode.node as HTMLElement),
    directive,
    vnode
  )
}

function callDirectiveHook(data: Data, vnode: VNode, directive: Directive, hookName: string) {
  const hooks = data[DIRECTIVE_HOOKS + directive.name],
  hook = hooks && hooks[hookName]
  if (hook) {
    hook(directive, vnode)
  }
}

export function afterCreate(api: DomApi, vnode: VNode) {

  const { directives } = vnode
  if (directives) {
    const data = vnode.data as Data
    for (let name in directives) {
      callDirectiveCreate(data, vnode, directives[name])
    }
  }

}

export function beforeUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {

  const newDirectives = vnode.directives,

  oldDirectives = oldVNode.directives,

  data = vnode.data as Data

  // 先触发 beforeDestroy 比较符合直觉
  if (oldDirectives) {
    const newValue = newDirectives || constant.EMPTY_OBJECT
    for (let name in oldDirectives) {
      if (newValue[name] === constant.UNDEFINED) {
        callDirectiveHook(
          data,
          vnode,
          oldDirectives[name],
          'beforeDestroy'
        )
      }
    }
  }

  if (newDirectives) {
    const oldValue = oldDirectives || constant.EMPTY_OBJECT, updatingDirectives: Directive[] = []
    for (let name in newDirectives) {
      const directive = newDirectives[name]
      if (oldValue[name] === constant.UNDEFINED) {
        callDirectiveCreate(data, vnode, directive)
      }
      else if (directive.value !== oldValue[name].value) {
        callDirectiveHook(
          data,
          vnode,
          directive,
          'beforeUpdate'
        )
        updatingDirectives.push(
          directive
        )
      }
    }
    data[DIRECTIVE_UPDATING] = updatingDirectives
  }

}

export function afterUpdate(api: DomApi, vnode: VNode, oldVNode: VNode) {
  const { data } = vnode
  if (data) {
    const directives = data[DIRECTIVE_UPDATING]
    if (directives) {
      for (let i = 0, length = directives.length; i < length; i++) {
        callDirectiveHook(
          data,
          vnode,
          directives[i],
          'afterUpdate'
        )
      }
      data[DIRECTIVE_UPDATING] = constant.UNDEFINED
    }
  }
}

export function beforeDestroy(api: DomApi, vnode: VNode) {

  const { directives } = vnode
  if (directives) {
    const data = vnode.data as Data
    for (let name in directives) {
      callDirectiveHook(
        data,
        vnode,
        directives[name],
        'beforeDestroy'
      )
    }
  }

}
