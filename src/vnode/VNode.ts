import Property from './Property'
import Directive from './Directive'

export default interface VNode {

  el: Node

  tag: string

  props: Record<string, Property>

  directives: Directive[]

  model: string | void

  ref: string | void

  key: string | void

  instance: any

  hooks: Object | void

  keypath: string

}
