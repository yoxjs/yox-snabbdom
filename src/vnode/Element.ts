import VNode from './VNode'
import Attribute from './Attribute'

export default interface Element extends VNode {

  attrs: Record<string, Attribute>

  children: Element[]

}
