import VNode from './VNode'

export default interface Directive extends VNode {

  name: string

  modifier: string | void

  value: any

}
