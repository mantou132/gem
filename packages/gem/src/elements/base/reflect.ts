import { GemElement } from '../../lib/element';
import { property } from '../../lib/decorators';

// 注意，预渲染可能造成重复的元素，在序列化时要手动移除 `dataset.reflect` 元素
// 不能在顶部根据 `dataset` 标记清除这些元素，因为延时加载时会把正常 reflect 元素清除，
// 比如 duoyun-ui 文档站加载示例元素时把 gem-book 的 reflect 元素清除
// ref 读取时需要用到 `target` `dataset`
export class GemReflectElement extends GemElement {
  @property target: HTMLElement = document.head;

  constructor() {
    super({ isLight: true });

    this.effect(
      () => {
        this.hidden = true;
        this.dataset.gemReflect = '';
      },
      () => [],
    );

    // 依赖于 lit-html 的 comment 标签
    // 动态数量的子元素不支持换 target
    let childNodes: ChildNode[] | undefined;
    this.effect(
      () => {
        childNodes = childNodes || [...this.childNodes];
        childNodes.forEach((node) => {
          if (node instanceof HTMLElement || node instanceof SVGElement) {
            node.dataset.reflect = '';
          }
          this.target.append(node);
        });
        return () => childNodes!.forEach((node) => node.remove());
      },
      () => [this.target],
    );
  }
}
