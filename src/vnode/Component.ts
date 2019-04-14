import Vnode from './Vnode'
import VNode from './Vnode';

export default interface Component extends Vnode {

  slots: Record<string, VNode | VNode[]>

}
