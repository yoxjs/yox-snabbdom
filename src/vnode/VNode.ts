import Property from './Property'
import Directive from './Directive'

export default interface VNode {

  el: Node

  tag: string

  isComponent: boolean

  isSvg: boolean

  isStatic: boolean

  props: Record<string, Property>

  directives: Record<string, Directive>

  model: string | void

  ref: string | void

  key: string | void

  instance: any

  hooks: Object | void

  keypath: string

}
