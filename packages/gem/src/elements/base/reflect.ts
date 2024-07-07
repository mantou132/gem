/**
 * - ref 读取时需要用到 `target` `dataset`
 * - 预渲染可能造成重复的元素，在序列化时可以用正则移除 GemReflectElement 渲染的从开始到结束连续的元素
 * - `replaceAll(/<!--gem-reflect-start-->.*?<!--gem-reflect-end-->/gs, '')`
 *
 * 不能在在顶级代码块中清除这些元素，因为重复加载该代码时会把正常 reflect 元素清除，
 * 比如 duoyun-ui 文档站加载示例元素时把 GemReflectElement 渲染的元素清除
 */
import { GemElement } from '../../lib/element';
import { attribute, property, shadow } from '../../lib/decorators';

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
@shadow({ mode: null })
export class GemReflectElement extends GemElement {
  @attribute method: 'prepend' | 'append';

  @property target: HTMLElement = document.head;

  get #method() {
    return this.method || 'append';
  }

  constructor() {
    super();

    this.effect(
      () => {
        this.hidden = true;
        this.dataset.gemReflect = '';
      },
      () => [],
    );

    const startNode = createReflectFragmentTag(START);
    const endNode = createReflectFragmentTag(END);
    let childNodes: undefined | ChildNode[];

    this.effect(
      () => {
        (childNodes || [startNode, ...this.childNodes, endNode]).forEach((node, index, arr) => {
          const prev = arr[index - 1];
          if (prev) {
            prev.after(node);
          } else {
            this.target[this.#method](node);
          }
        });
        return () => {
          childNodes = getReflectFragment(startNode);
          childNodes.forEach((node) => node.remove());
        };
      },
      () => [this.target],
    );
  }
}
