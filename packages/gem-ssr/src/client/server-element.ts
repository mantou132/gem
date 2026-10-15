import { SSR_SERVER } from '../constants';
import { getServerElementKey } from '../decorators';

type ServerElementLoader = (
  key: string,
  tag: string,
  attrs: Record<string, string>,
  props: Record<string, unknown>,
) => Promise<string>;

let loader: ServerElementLoader | undefined;

/**
 * 设置获取纯服务端元素 HTML 的方法，客户端创建纯服务端元素时调用，例如客户端导航时
 *
 * 返回服务端渲染的 HTML，其中第一个该标签的元素的内容会作为客户端元素的内容，
 * 服务端可以使用 `renderServerElement` 渲染
 */
export function setServerElementLoader(fn: ServerElementLoader) {
  loader = fn;
}

/**
 * 客户端构建时，`@server()` 标记的纯服务端元素会被替换成这个类
 *
 * 首屏使用服务端输出的内容，客户端创建时和 attribute 改变时从 `setServerElementLoader` 获取内容，
 * property 只在创建时使用
 */
export class GemServerElement extends HTMLElement {
  // 当前内容对应的 key
  #key?: string;

  constructor() {
    super();
    // 水合时会设置相同的 attribute 值，只在值改变时获取
    new MutationObserver((records) => {
      if (records.some(({ attributeName, oldValue }) => this.getAttribute(attributeName!) !== oldValue)) this.#load();
    }).observe(this, { attributes: true, attributeOldValue: true });
  }

  #getParams() {
    const tag = this.localName;
    const attrs = Object.fromEntries(this.getAttributeNames().map((name) => [name, this.getAttribute(name)!]));
    // 模板绑定的 property 是元素自身的属性
    const props = Object.fromEntries(Object.entries(this));
    return { key: getServerElementKey(tag, attrs, props), tag, attrs, props };
  }

  #load = async () => {
    const { key, tag, attrs, props } = this.#getParams();
    if (key === this.#key) return;
    this.#key = key;
    if (!loader) throw new Error('gem-ssr: server element loader is not set');
    const html = await loader(key, tag, attrs, props);
    // 已经有更新的请求
    if (key !== this.#key) return;
    const source = Document.parseHTMLUnsafe(html).querySelector(tag);
    if (!source) return;
    if (source.shadowRoot) {
      const root = this.shadowRoot || this.attachShadow({ mode: source.shadowRoot.mode });
      root.replaceChildren(...source.shadowRoot.childNodes);
    } else {
      this.replaceChildren(...source.childNodes);
    }
  };

  connectedCallback() {
    if (this.#key !== undefined) return;
    if (this.hasAttribute(SSR_SERVER)) {
      this.removeAttribute(SSR_SERVER);
      this.#key = this.#getParams().key;
      return;
    }
    this.#load();
  }
}
