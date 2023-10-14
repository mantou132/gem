/**
 * 标题显示在：
 *
 * - 桌面端 Tab 的 title
 * - 移动端 AppBar 的 title
 *
 * 修改标题：
 *
 * - `<gem-route>` 匹配路由时自动设置 `route.title`
 * - `<gem-link>` 的 `doc-title` 属性和 `route.title`
 * - 修改路径时，`history` 默认设置 `title` 为空
 * - 数据获取后，手动调用 `Title.setTitle`
 * - `<gem-title>` 作为默认值设置
 */

import { GemElement, html } from '../../lib/element';
import { attribute, connectStore } from '../../lib/decorators';
import { updateStore, connect } from '../../lib/store';
import { titleStore } from '../../lib/history';

/**
 * 允许声明式设置 `document.title`
 * @attr suffix
 */
@connectStore(titleStore)
export class GemTitleElement extends GemElement {
  // 没有后缀的标题
  static title = document.title;
  static defaultTitle = document.title;
  static defaultPrefix = `${document.title} | `;
  static defaultSuffix = ` - ${document.title}`;

  static setTitle(title: string) {
    updateStore(titleStore, { title });
  }

  static updateTitle(title = titleStore.title, prefix = '', suffix = '') {
    if (title === GemTitleElement.defaultTitle) {
      document.title = GemTitleElement.title = title;
    } else {
      GemTitleElement.title = title;
      document.title = prefix + GemTitleElement.title + suffix;
    }
  }

  @attribute prefix: string;
  @attribute suffix: string;

  constructor() {
    super();
    new MutationObserver(() => this.update()).observe(this, { childList: true, characterData: true, subtree: true });
  }

  render() {
    // 多个 <gem-title> 时，最终 document.title 按执行顺序决定
    GemTitleElement.updateTitle(this.textContent || undefined, this.prefix, this.suffix);

    if (this.hidden) {
      return html``;
    }
    return html`${GemTitleElement.title}`;
  }
}

connect(titleStore, GemTitleElement.updateTitle);
