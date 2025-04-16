/**
 * 标题显示在：
 *
 * - 桌面端 Tab 的 title
 * - 移动端 AppBar 的 title
 *
 * 修改标题：titleStore 的 title 优先级高，比如 history 添加的 dialog Title
 *
 * - `<gem-route>` 匹配路由时自动设置 `route.title`
 * - 修改路径（查询参数）时，`history` 默认设置 `title` 为空，运行 Modal 设置临时标题
 * - 数据获取后，手动调用 `Title.setTitle`
 * - `<gem-title>` 作为默认值设置
 */

import { attribute, boolattribute, effect, mounted, shadow, template } from '../../lib/decorators';
import { titleStore } from '../../lib/history';
import { GemElement, html } from '../../lib/reactive';
import { connect } from '../../lib/store';

// 避免重定向时的中间状态标题
let timer: ReturnType<typeof setTimeout> | number = 0;
const setTitle = (documentTitle: string) => {
  clearTimeout(timer);
  timer = setTimeout(() => (document.title = documentTitle));
};

function setDocumentTitle(defaultTitle?: string | null, prefix = '', suffix = '') {
  const title = titleStore.title || defaultTitle;
  if (title && title !== titleStore.defaultTitle) {
    GemTitleElement.title = title;
    setTitle(prefix + GemTitleElement.title + suffix);
  } else {
    GemTitleElement.title = titleStore.defaultTitle;
    setTitle(GemTitleElement.title);
  }
}

@shadow()
export class GemTitleElement extends GemElement {
  @attribute prefix: string;
  @attribute suffix: string;
  @boolattribute inert: boolean;

  // 没有后缀的当前标题
  static title = document.title;

  static setTitle(title: string) {
    titleStore({ title });
  }

  @effect((i) => [i.inert])
  #connectStore = () => !this.inert && connect(titleStore, this.update);

  #ob = new MutationObserver(() => this.update());

  @mounted()
  #obTextContent = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
  };

  @template()
  #content = () => {
    // 多个 <gem-title> 时，最终 document.title 按渲染顺序决定
    setDocumentTitle(this.textContent?.trim(), this.prefix, this.suffix);
    return html`${GemTitleElement.title}`;
  };
}
