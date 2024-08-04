/**
 * - ref 读取时需要用到 `target` `dataset`
 * - 预渲染可能造成重复的元素，在序列化时可以用正则移除 GemReflectElement 渲染的从开始到结束连续的元素
 * - `replaceAll(/<!--gem-reflect-start-->.*?<!--gem-reflect-end-->/gs, '')`
 *
 * 不能在在顶级代码块中清除这些元素，因为重复加载该代码时会把正常 reflect 元素清除，
 * 比如 duoyun-ui 文档站加载示例元素时把 GemReflectElement 渲染的元素清除
 */
import { GemElement } from '../../lib/element';
import { attribute, effect, property, willMount } from '../../lib/decorators';

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

/**
 * @customElement gem-reflect
 */
export class GemReflectElement extends GemElement {
  @attribute method: 'prepend' | 'append';

  @property target: HTMLElement = document.head;

  get #method() {
    return this.method || 'append';
  }

  @willMount()
  #init = () => {
    this.hidden = true;
    this.dataset.gemReflect = '';
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
