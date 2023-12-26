/**
 * 标题显示在：
 *
 * - 桌面端 Tab 的 title
 * - 移动端 AppBar 的 title
 *
 * 修改标题：titleStore 的 title 优先级高，比如 history 添加的 dialog Title
 *
 * - `<gem-route>` 匹配路由时自动设置 `route.title`
 * - `<gem-link>` 的 `doc-title` 属性和 `route.title`
 * - 修改路径时，`history` 默认设置 `title` 为空
 * - 数据获取后，手动调用 `Title.setTitle`
 * - `<gem-title>` 作为默认值设置
 */

import { GemElement, html } from '../../lib/element';
import { attribute, boolattribute } from '../../lib/decorators';
import { updateStore, connect, disconnect } from '../../lib/store';
import { titleStore } from '../../lib/history';

const defaultTitle = document.title;

function setDocumentTitle(str?: string | null, prefix = '', suffix = '') {
  const title = titleStore.title || str;
  if (title && title !== defaultTitle) {
    GemTitleElement.title = title;
    document.title = prefix + GemTitleElement.title + suffix;
  } else {
    GemTitleElement.title = defaultTitle;
    document.title = GemTitleElement.title;
  }
}

connect(titleStore, setDocumentTitle);

export const PREFIX = `${defaultTitle} | `;
export const SUFFIX = ` - ${defaultTitle}`;

/**
 * 映射到 `document.title`
 * @attr prefix
 * @attr suffix
 */
export class GemTitleElement extends GemElement {
  @attribute prefix: string;
  @attribute suffix: string;
  @boolattribute inert: boolean;

  // 没有后缀的当前标题
  static title = document.title;

  /**@deprecated */
  static defaultPrefix = PREFIX;
  /**@deprecated */
  static defaultSuffix = SUFFIX;

  static setTitle(title: string) {
    updateStore(titleStore, { title });
  }

  constructor() {
    super();
    new MutationObserver(() => this.update()).observe(this, {
      characterData: true,
      subtree: true,
    });
  }

  mounted = () => {
    this.effect(
      () => {
        if (!this.inert) connect(titleStore, this.update);
        return () => disconnect(titleStore, this.update);
      },
      () => [this.inert],
    );
  };

  render() {
    // 多个 <gem-title> 时，最终 document.title 按执行顺序决定
    setDocumentTitle(this.textContent?.trim(), this.prefix, this.suffix);
    return html`${GemTitleElement.title}`;
  }
}
