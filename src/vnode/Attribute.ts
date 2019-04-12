import VNode from './VNode'

export default interface Attribute extends VNode {

  namespace: string

  name: string

  value: any

}
