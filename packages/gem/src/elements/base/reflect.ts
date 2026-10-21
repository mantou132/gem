/**
 * 把子节点移动到 `target`（默认 `document.head`）中，用开始和结束注释标记这些节点，
 * 修改 `target` 或者卸载时一起移动或移除
 *
 * 服务端渲染时不执行 effect，客户端水合后才移动
 */

import { attribute, effect, property, willMount } from '../../lib/decorators';
import { GemElement } from '../../lib/reactive';

const START = 'gem-reflect-start';
const END = 'gem-reflect-end';

const createReflectFragmentTag = (tag: string) => new Comment(tag);

const getReflectFragment = (startNode: Comment) => {
  const result: ChildNode[] = [];
  let node: ChildNode | null = startNode;
  while (node) {
    result.push(node);
    if (node.nodeValue === END) break;
    node = node.nextSibling;
  }
  return result;
};

export class GemReflectElement extends GemElement {
  @attribute method: 'prepend' | 'append';

  @property target: HTMLElement = document.head;

  get #method() {
    return this.method || 'append';
  }

  @willMount()
  #init = () => {
    this.hidden = true;
  };

  #startNode = createReflectFragmentTag(START);
  #endNode = createReflectFragmentTag(END);
  #childNodes: undefined | ChildNode[];

  @effect((i) => [i.target])
  #changeTarget = () => {
    (this.#childNodes || [this.#startNode, ...this.childNodes, this.#endNode]).forEach((node, index, arr) => {
      const prev = arr[index - 1];
      if (prev) {
        prev.after(node);
      } else {
        this.target[this.#method](node);
      }
    });
    return () => {
      this.#childNodes = getReflectFragment(this.#startNode);
      this.#childNodes.forEach((node) => node.remove());
    };
  };
}
