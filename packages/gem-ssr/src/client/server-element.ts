import { SSR_HIDDEN, SSR_SERVER } from '../constants';
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

/** 元素的 key、标签名、attribute 和 property，用来获取服务端渲染的 HTML */
export function getServerElementParams(ele: Element) {
  const tag = ele.localName;
  const attrs = Object.fromEntries(ele.getAttributeNames().map((name) => [name, ele.getAttribute(name)!]));
  // 模板绑定的 property 是元素自身的属性
  const props = Object.fromEntries(Object.entries(ele));
  return { key: getServerElementKey(tag, attrs, props), tag, attrs, props };
}

// 正在获取的 HTML
const pendingLoads = new Set<Promise<unknown>>();

/**
 * 等待客户端创建的纯服务端元素和延时视图元素获取 HTML，失败的也算完成，例如客户端导航后恢复滚动位置前
 *
 * 复用的元素在微任务中更新，观察回调也在微任务中执行，所以先等到下一帧绘制前，需要获取的元素都已经开始获取，
 * 不需要等待时在这一帧绘制前完成
 */
export async function waitServerElements() {
  await new Promise(requestAnimationFrame);
  return Promise.allSettled(pendingLoads);
}

/** 获取服务端渲染的元素，没有时返回 `null` */
export async function loadServerElement({ key, tag, attrs, props }: ReturnType<typeof getServerElementParams>) {
  if (!loader) throw new Error('gem-ssr: server element loader is not set');
  const promise = loader(key, tag, attrs, props);
  const remove = () => pendingLoads.delete(promise);
  pendingLoads.add(promise);
  promise.then(remove, remove);
  const html = await promise;
  // `Document.parseHTMLUnsafe` 会移除注释，水合需要其中的标记
  const template = document.createElement('template');
  template.setHTMLUnsafe(html);
  return template.content.querySelector(tag);
}

/** 使用服务端渲染的元素的内容 */
export function fillServerContent(ele: Element, source: Element) {
  const { shadowRoot } = source;
  if (shadowRoot) {
    const { mode, delegatesFocus, serializable, clonable, slotAssignment } = shadowRoot;
    const root = ele.shadowRoot || ele.attachShadow({ mode, delegatesFocus, serializable, clonable, slotAssignment });
    root.replaceChildren(...shadowRoot.childNodes);
  } else {
    ele.replaceChildren(...source.childNodes);
  }
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
    // 水合时会设置相同的 attribute 值，只在值改变时获取，没有挂载时在挂载时获取
    new MutationObserver((records) => {
      if (!this.isConnected) return;
      if (records.some(({ attributeName, oldValue }) => this.getAttribute(attributeName!) !== oldValue)) this.#load();
    }).observe(this, { attributes: true, attributeOldValue: true });
  }

  #load = async () => {
    const params = getServerElementParams(this);
    if (params.key === this.#key) return;
    this.#key = params.key;
    const source = await loadServerElement(params);
    // 已经有更新的请求
    if (params.key !== this.#key || !source) return;
    fillServerContent(this, source);
  };

  connectedCallback() {
    if (this.hasAttribute(SSR_SERVER)) {
      this.removeAttribute(SSR_SERVER);
      this.#key = getServerElementParams(this).key;
      return;
    }
    // 服务端隐藏的条件分支中没有内容，水合时会被移除，显示时再获取
    if (this.closest(`[${SSR_HIDDEN}]`)) return;
    // key 没有改变时不会重新获取
    this.#load();
  }
}
