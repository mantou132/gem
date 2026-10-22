/**
 * 把子节点移动到 `target`（默认 `document.head`）中，用开始和结束注释标记这些节点，
 * 修改 `target` 或者卸载时一起移动或移除
 *
 * 服务端渲染时不执行 effect，客户端水合后才移动，使用 `getLogicalParent` 从被移动的节点找到 reflect 元素
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

// 移动到的目标元素和片段开始注释对应的 reflect 元素，向上查找元素时跨越 reflect
const targets = new WeakSet<Node>();
const startNodes = new WeakMap<Node, GemReflectElement>();

// 向前查找片段的开始注释，遇到其他片段的结束注释时不在片段中
const getReflectElement = (node: Node) => {
  for (let n = node.previousSibling; n; n = n.previousSibling) {
    const ele = startNodes.get(n);
    if (ele) return ele;
    if (n.nodeValue === END) return;
  }
};

/**
 * 节点的逻辑父元素：被 reflect 移动的节点是 reflect 元素，ShadowRoot 中顶层的节点是宿主，其他是父元素
 */
export function getLogicalParent(node: Node): Element | null {
  const parent = node.parentNode;
  if (parent && targets.has(parent)) {
    const ele = getReflectElement(node);
    if (ele) return ele;
  }
  return parent instanceof ShadowRoot ? parent.host : node.parentElement;
}

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
    targets.add(this.target);
    startNodes.set(this.#startNode, this);
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
