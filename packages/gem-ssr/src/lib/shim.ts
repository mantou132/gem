import { AsyncLocalStorage } from 'node:async_hooks';

// 服务端不创建 DOM 树，只提供 Gem 加载和元素实例化需要的最少 API

class SSRNode extends EventTarget {
  parentNode: SSRNode | null = null;
  textContent = '';

  // 元素不会真正挂载，`disconnectedCallback` 才会清理
  get isConnected() {
    return false;
  }

  // 没有节点树
  get children() {
    return [];
  }

  getRootNode(): SSRNode {
    return this.parentNode ? this.parentNode.getRootNode() : this;
  }

  append(...nodes: SSRNode[]) {
    for (const node of nodes) node.parentNode = this;
  }

  prepend(...nodes: SSRNode[]) {
    this.append(...nodes);
  }
}

class SSRShadowRoot extends SSRNode {
  adoptedStyleSheets: CSSStyleSheet[] = [];
  host: SSRElement;
  mode: ShadowRootMode;
  delegatesFocus: boolean;
  serializable: boolean;
  clonable: boolean;
  slotAssignment: SlotAssignmentMode;
  /** 模版返回 `undefined` 时作为 ShadowDOM 的内容输出，不会解析和转义 */
  innerHTML = '';

  constructor(host: SSRElement, init: ShadowRootInit) {
    super();
    this.host = host;
    this.mode = init.mode;
    this.delegatesFocus = !!init.delegatesFocus;
    this.serializable = !!init.serializable;
    this.clonable = !!init.clonable;
    this.slotAssignment = init.slotAssignment || 'named';
  }

  getRootNode() {
    return this;
  }

  // 没有节点树
  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

class SSRElement extends SSRNode {
  localName: string;
  shadowRoot: SSRShadowRoot | null = null;
  /** light DOM 元素的模版返回 `undefined` 时作为内容输出，不会解析和转义 */
  innerHTML = '';
  #attributes = new Map<string, string>();

  constructor(localName = '') {
    super();
    this.localName = localName;
  }

  get tagName() {
    return this.localName.toUpperCase();
  }

  // Gem 元素用 `this.attributes.foo` 判断 attribute 是否存在
  get attributes() {
    return Object.fromEntries([...this.#attributes].map(([name, value]) => [name, { name, value }]));
  }

  getAttributeNames() {
    return [...this.#attributes.keys()];
  }

  getAttribute(name: string) {
    return this.#attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.#attributes.has(name);
  }

  setAttribute(name: string, value: string) {
    this.#attributes.set(name, String(value));
  }

  removeAttribute(name: string) {
    this.#attributes.delete(name);
  }

  toggleAttribute(name: string, force?: boolean) {
    const value = force ?? !this.#attributes.has(name);
    value ? this.#attributes.set(name, '') : this.#attributes.delete(name);
    return value;
  }

  attachShadow(init: ShadowRootInit) {
    this.shadowRoot = new SSRShadowRoot(this, init);
    return this.shadowRoot;
  }

  attachInternals() {
    const { shadowRoot } = this;
    return { states: new Set<string>(), shadowRoot };
  }
}

const registry = new Map<string, CustomElementConstructor>();
const names = new Map<CustomElementConstructor, string>();

class SSRHTMLElement extends SSRElement {
  constructor() {
    super(names.get(new.target as unknown as CustomElementConstructor));
  }
}

class SSRTemplateElement extends SSRElement {}

// 服务端不观察变化
class SSRObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

class SSRCSSStyleSheet {
  media: { mediaText: string };
  cssText = '';

  constructor({ media = '' }: CSSStyleSheetInit = {}) {
    this.media = { mediaText: media as string };
  }

  replaceSync(text: string) {
    this.cssText = text;
  }
}

class SSRDocument extends SSRNode {
  title = '';
  adoptedStyleSheets: CSSStyleSheet[] = [];
  documentElement = new SSRElement('html');
  head = new SSRElement('head');
  body = new SSRElement('body');

  createElement(localName: string) {
    return new SSRElement(localName);
  }

  createComment() {
    return new SSRNode();
  }

  createTreeWalker() {
    return { currentNode: null, nextNode: () => null };
  }

  querySelector() {
    return null;
  }
}

const requestScope = new AsyncLocalStorage<WeakMap<object, any>>();

// 每个请求独立的数据，不在请求中时使用 `global`（例如模块顶层）
function getScoped<T extends object>(global: T, init: () => T): T {
  const scope = requestScope.getStore();
  if (!scope) return global;
  if (!scope.has(global)) scope.set(global, init());
  return scope.get(global);
}

/**
 * 在独立的请求作用域中执行，store、history、location 等全局状态在请求间互不影响
 *
 * 已经在请求中时使用当前的请求作用域
 */
export function runInRequest<T>(fn: () => T) {
  return requestScope.getStore() ? fn() : requestScope.run(new WeakMap(), fn);
}

const globalNavigation = { url: new URL('http://localhost/'), state: null as unknown };

// 当前请求的 URL 和 history 状态
const getNavigation = () => getScoped(globalNavigation, () => ({ ...globalNavigation }));

/** 设置请求的 URL */
export function setLocation(href: string) {
  const navigation = getNavigation();
  navigation.url = new URL(href, navigation.url);
}

const location = {
  get href() {
    return getNavigation().url.href;
  },
  get origin() {
    return getNavigation().url.origin;
  },
  get protocol() {
    return getNavigation().url.protocol;
  },
  get host() {
    return getNavigation().url.host;
  },
  get hostname() {
    return getNavigation().url.hostname;
  },
  get port() {
    return getNavigation().url.port;
  },
  get pathname() {
    return getNavigation().url.pathname;
  },
  get search() {
    return getNavigation().url.search;
  },
  get hash() {
    return getNavigation().url.hash;
  },
  toString() {
    return getNavigation().url.href;
  },
};

// 只有一条历史记录，Gem 会接管 `pushState` 和 `replaceState`，所以不能互相调用
function setState(state: unknown, href?: string) {
  getNavigation().state = state;
  if (href) setLocation(href);
}

const history = {
  length: 1,
  get state() {
    return getNavigation().state;
  },
  pushState(state: unknown, _: string, href?: string) {
    setState(state, href);
  },
  replaceState(state: unknown, _: string, href?: string) {
    setState(state, href);
  },
  back() {},
  forward() {},
  go() {},
};

/**
 * Node.js 25 自带的 `localStorage` 没有指定 `--localstorage-file` 时会报错，指定时所有请求共用，
 * 替换成每个请求独立的内存存储
 */
class SSRStorage {
  #global = new Map<string, string>();

  get #data() {
    return getScoped(this.#global, () => new Map());
  }

  get length() {
    return this.#data.size;
  }

  key(index: number) {
    return [...this.#data.keys()][index] ?? null;
  }

  getItem(key: string) {
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#data.set(key, String(value));
  }

  removeItem(key: string) {
    this.#data.delete(key);
  }

  clear() {
    this.#data.clear();
  }
}

const window = new EventTarget();

Object.defineProperties(globalThis, {
  Storage: { value: SSRStorage, configurable: true, writable: true },
  localStorage: { value: new SSRStorage(), configurable: true, writable: true },
  sessionStorage: { value: new SSRStorage(), configurable: true, writable: true },
});

Object.assign(globalThis, {
  window: globalThis,
  document: new SSRDocument(),
  Node: SSRNode,
  Comment: SSRNode,
  Text: SSRNode,
  HTMLTemplateElement: SSRTemplateElement,
  MutationObserver: SSRObserver,
  ResizeObserver: SSRObserver,
  IntersectionObserver: SSRObserver,
  // 服务端不知道浏览器支持哪些特性
  CSS: { supports: () => false, escape: (s: string) => s.replace(/[^\w-]/g, (c) => `\\${c}`) },
  Element: SSRElement,
  HTMLElement: SSRHTMLElement,
  SVGElement: SSRElement,
  ShadowRoot: SSRShadowRoot,
  Document: SSRDocument,
  CSSStyleSheet: SSRCSSStyleSheet,
  customElements: {
    define(name: string, cls: CustomElementConstructor) {
      registry.set(name, cls);
      names.set(cls, name);
    },
    get: (name: string) => registry.get(name),
    getName: (cls: CustomElementConstructor) => names.get(cls) ?? null,
    whenDefined: async (name: string) => registry.get(name),
  },
  location,
  history,
  addEventListener: window.addEventListener.bind(window),
  removeEventListener: window.removeEventListener.bind(window),
  dispatchEvent: window.dispatchEvent.bind(window),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now())),
  cancelAnimationFrame: clearTimeout,
  matchMedia: (media: string) => ({ media, matches: false, addEventListener() {}, removeEventListener() {} }),
  // 让 Gem 进入 SSR 模式，返回当前请求的作用域，Gem 用来隔离每个请求的全局状态
  __GEM_SSR__: () => requestScope.getStore(),
});
