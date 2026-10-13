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
}

class SSRElement extends SSRNode {
  localName: string;
  shadowRoot: SSRShadowRoot | null = null;
  #attributes = new Map<string, string>();

  constructor(localName = '') {
    super();
    this.localName = localName;
  }

  get tagName() {
    return this.localName.toUpperCase();
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

let url = new URL('http://localhost/');

/** 设置请求的 URL */
export function setLocation(href: string) {
  url = new URL(href, url);
}

const location = {
  get href() {
    return url.href;
  },
  get origin() {
    return url.origin;
  },
  get protocol() {
    return url.protocol;
  },
  get host() {
    return url.host;
  },
  get hostname() {
    return url.hostname;
  },
  get port() {
    return url.port;
  },
  get pathname() {
    return url.pathname;
  },
  get search() {
    return url.search;
  },
  get hash() {
    return url.hash;
  },
  toString() {
    return url.href;
  },
};

const history = {
  state: null as unknown,
  length: 1,
  pushState(state: unknown, _: string, href?: string) {
    this.replaceState(state, _, href);
  },
  replaceState(state: unknown, _: string, href?: string) {
    this.state = state;
    if (href) setLocation(href);
  },
  back() {},
  forward() {},
  go() {},
};

const window = new EventTarget();

Object.assign(globalThis, {
  window: globalThis,
  document: new SSRDocument(),
  Node: SSRNode,
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
  // 让 Gem 进入 SSR 模式：不执行副作用，同步更新
  nQM: queueMicrotask,
});
