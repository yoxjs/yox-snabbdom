import VNode from './VNode'
import Property from './Property'
import Attribute from './Attribute'
import Directive from './Directive'

export default interface Element extends VNode {

  tag: string

  attrs: Attribute[]

  props: Property[]

  directives: Directive[]

  children: Element[]

  slots: Object | void

  model: string | void

  ref: VNode

  key: any

  instance: any

  text: string | void

  hooks: Object | void

}
