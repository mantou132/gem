import { html, render, TemplateResult } from 'lit-html';
import { connect, disconnect, Store } from './store';
import {
  Pool,
  addMicrotask,
  Sheet,
  SheetToken,
  isArrayChange,
  GemError,
  kebabToCamelCase,
  PropProxyMap,
} from './utils';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';

// https://github.com/Polymer/lit-html/issues/1048
export { guard } from 'lit-html/directives/guard';

export { ifDefined } from 'lit-html/directives/if-defined';

declare global {
  interface ElementInternals {
    states: DOMTokenList;
  }
  // 用于 css 选择器选择元素，使用 @refobject 自动选择获取
  // 必须使用 attr 赋值
  /**@attr ref */
  interface HTMLElement {
    attachInternals?: () => ElementInternals;
  }
}

function emptyFunction() {
  // 用于占位的空函数
}

function execCallback(fun: any) {
  typeof fun === 'function' && fun();
}

// global render task pool
const asyncRenderTaskPool = new Pool<() => void>();
let loop = false;
const tick = () => {
  window.requestAnimationFrame(function callback(timestamp) {
    const task = asyncRenderTaskPool.get();
    if (task) {
      task();
      if (performance.now() - timestamp < 16) {
        callback(timestamp);
        return;
      }
    }
    // `renderTaskPool` not empty
    if (loop) {
      tick();
    }
  });
};
asyncRenderTaskPool.addEventListener('start', () => {
  loop = true;
  tick();
});
asyncRenderTaskPool.addEventListener('end', () => (loop = false));

type GetDepFun<T> = () => T;
type EffectCallback<T> = (arg: T) => any;
type EffectItem<T> = {
  callback: EffectCallback<T>;
  initialized: boolean;
  values?: T;
  getDep?: GetDepFun<T>;
  preCallback?: () => void;
};

const initSymbol = Symbol('init');
const updateSymbol = Symbol('update');

export abstract class GemElement<T = Record<string, unknown>> extends HTMLElement {
  // 这里只是字段申明，不能赋值，否则子类会继承被共享该字段
  static observedAttributes?: string[]; // WebAPI 中是实时检查这个列表
  static booleanAttributes?: Set<string>;
  static numberAttributes?: Set<string>;
  static observedPropertys?: string[];
  static observedStores?: Store<unknown>[];
  static adoptedStyleSheets?: Sheet<unknown>[];
  static defineEvents?: string[];
  static defineCSSStates?: string[];
  static defineRefs?: string[];
  // 以下静态字段仅供外部读取，没有实际作用
  static defineParts?: string[];
  static defineSlots?: string[];

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: T;

  #renderRoot: HTMLElement | ShadowRoot;
  #internals?: ElementInternals;
  #isMounted?: boolean;
  #isAsync?: boolean;
  #effectList?: EffectItem<any>[];
  #unmountCallback?: any;

  constructor(options?: { isLight?: boolean; isAsync?: boolean }) {
    super();

    // 外部不可见，但允许类外面使用
    addMicrotask(() => ((this as any)[initSymbol] = false));
    (this as any)[initSymbol] = true;
    (this as any)[updateSymbol] = () => {
      if (this.#isMounted) {
        addMicrotask(this.#update);
      }
    };

    this.#isAsync = options?.isAsync;
    this.#renderRoot = options?.isLight ? this : this.attachShadow({ mode: 'open' });

    const { adoptedStyleSheets } = new.target;
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map((item) => item[SheetToken] || item);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        throw new GemError('Please mount to ShadowDOM or Document');
      }
    }
  }

  get internals() {
    if (!this.#internals) {
      if (!this.attachInternals) {
        // https://bugs.webkit.org/show_bug.cgi?id=197960
        this.attachInternals = () => ({ states: this.classList });
      }
      this.#internals = this.attachInternals();
      if (!this.#internals.states) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1588763
        this.#internals.states = this.classList;
      }
    }
    return this.#internals;
  }

  /**
   * @helper
   * 设置元素 state，会触发更新
   *
   * ```js
   * class App extends GemElement {
   *   click() {
   *     this.setState({});
   *   }
   * }
   * ```
   * */
  setState = (payload: Partial<T>) => {
    if (!this.state) throw new GemError('`state` not initialized');
    Object.assign(this.state, payload);
    addMicrotask(this.#update);
  };

  /**
   * 每次更新完检查依赖，执行对应的副作用回调
   * */
  #execEffect = () => {
    this.#effectList?.forEach((effectItem) => {
      const { callback, getDep, values, preCallback } = effectItem;
      const newValues = getDep?.();
      if (!getDep || isArrayChange(values, newValues)) {
        execCallback(preCallback);
        effectItem.preCallback = callback(newValues);
        effectItem.values = newValues;
      }
    });
  };

  /**
   * @helper
   * 记录副作用回调和值，不要在重复执行的生命周期回调中调用
   *
   * ```js
   * class App extends GemElement {
   *   mounted() {
   *     this.effect(callback, () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  effect = <T = any[] | undefined>(
    callback: EffectCallback<T>,
    getDep?: T extends any[] ? () => [...T] : undefined,
  ) => {
    if (!this.#effectList) this.#effectList = [];
    const values = getDep?.() as T;
    const effectItem: EffectItem<T> = {
      callback,
      getDep,
      values,
      initialized: !!this.#isMounted,
    };
    // 以挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.#isMounted) effectItem.preCallback = callback(values);
    this.#effectList.push(effectItem);
  };

  /**
   * 元素挂载后执行还未初始化的副作用
   * */
  #initEffect = () => {
    this.#effectList?.forEach((effectItem) => {
      const { callback, getDep, initialized } = effectItem;
      if (!initialized) {
        effectItem.preCallback = callback(getDep?.());
        effectItem.initialized = true;
      }
    });
  };

  /**@lifecycle */
  willMount?(): void | Promise<void>;

  /**
   * @lifecycle
   * 返回 null 时渲染 lit-html 定义的空内容
   * 返回 undefined 时不会调用 `render()`
   * */
  render?(): TemplateResult | null | undefined;

  #render = () => {
    if (this.render) return this.render();
    return this.#renderRoot === this ? undefined : html`<slot></slot>`;
  };

  /**@lifecycle */
  mounted?(): void | (() => void) | Promise<void>;

  /**@lifecycle */
  shouldUpdate?(): boolean;
  #shouldUpdate = () => {
    return this.shouldUpdate ? this.shouldUpdate() : true;
  };

  #updateCallback = () => {
    if (this.#isMounted && this.#shouldUpdate()) {
      const temp = this.#render();
      temp !== undefined && render(temp, this.#renderRoot);
      addMicrotask(this.#updated);
      addMicrotask(this.#execEffect);
    }
  };

  #update = () => {
    if (this.#isAsync) {
      asyncRenderTaskPool.add(this.#updateCallback);
    } else {
      this.#updateCallback();
    }
  };

  /**@helper */
  update = () => {
    this.#update();
  };

  /**@lifecycle */
  updated?(): void | Promise<void>;
  #updated = () => {
    this.updated?.();
  };

  /**@lifecycle */
  unmounted?(): void | Promise<void>;

  /**@private */
  /**@final */
  attributeChangedCallback() {
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
  }

  #connectedCallback = () => {
    this.willMount?.();
    const { observedStores } = this.constructor as typeof GemElement;
    observedStores?.forEach((store) => {
      connect(store, this.#update);
    });
    const temp = this.#render();
    temp !== undefined && render(temp, this.#renderRoot);
    this.#isMounted = true;
    this.#unmountCallback = this.mounted?.();
    this.#initEffect();
  };

  /**@private */
  /**@final */
  connectedCallback() {
    if (this.#isAsync) {
      asyncRenderTaskPool.add(this.#connectedCallback);
    } else {
      this.#connectedCallback();
    }
  }

  /**@private */
  /**@final */
  // adoptedCallback() {}

  /**@private */
  /**@final */
  disconnectedCallback() {
    this.#isMounted = false;
    const { observedStores } = this.constructor as typeof GemElement;
    observedStores?.forEach((store) => {
      disconnect(store, this.#update);
    });
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList?.forEach((effectItem) => {
      execCallback(effectItem.preCallback);
    });
  }
}

const gemElementProxyMap = new PropProxyMap<GemElement>();

export function defineAttribute(target: GemElement, prop: string, attr: string) {
  const { booleanAttributes, numberAttributes } = target.constructor as typeof GemElement;
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      // fix karma test
      // 判断是否是自定义元素实例
      if (!(initSymbol in this)) return;
      const that = this as GemElement;
      // 不能从 proxy 对象中读取值
      const value = that.getAttribute(attr);
      if (booleanAttributes?.has(attr)) {
        return value === null ? false : true;
      }
      if (numberAttributes?.has(attr)) {
        return Number(value);
      }
      return value || '';
    },
    set(v: string | null | undefined | number | boolean) {
      const that = this as GemElement;
      const proxy = gemElementProxyMap.get(this) as any;
      const hasSet = proxy[prop];
      const value = that.getAttribute(attr);
      // https://github.com/whatwg/dom/issues/922
      if (this[initSymbol] && value !== null && !hasSet) return;
      // 字段和构造函数中都有对 attr 设置时会执行多次
      // Firefox WebConsole 中不知道为什么在构造函数中 this[initSymbol] 已经为 false
      proxy[prop] = true;
      const isBool = booleanAttributes?.has(attr);
      if (v === null || v === undefined) {
        that.removeAttribute(attr);
      } else if (isBool) {
        // 当 attr 存在且 !!v 为 true 时，toggleAttribute 不会造成 Attribute 改变
        that.toggleAttribute(attr, !!v);
      } else {
        if (value !== String(v)) that.setAttribute(attr, String(v));
      }
    },
  });
}

const isEventHandleSymbol = Symbol('event handle');
export function defineProperty(
  target: GemElement,
  prop: string,
  event?: string,
  eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>,
) {
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      const value = gemElementProxyMap.get(this)[prop];
      if (value || !event) {
        return value;
      } else {
        this[prop] = emptyFunction;
        return this[prop];
      }
    },
    set(v) {
      const that = this as GemElement;
      const proxy = gemElementProxyMap.get(that) as any;
      if (v !== proxy[prop]) {
        if (event) {
          proxy[prop] = v?.[isEventHandleSymbol]
            ? v
            : (detail: any, options: any) => {
                const evt = new CustomEvent(event, { ...options, ...eventOptions, detail });
                that.dispatchEvent(evt);
                v(detail, options);
              };
          proxy[prop][isEventHandleSymbol] = true;
          // emitter 不触发元素更新
        } else {
          proxy[prop] = v;
          this[updateSymbol]();
        }
      }
    },
  });
}

export function defineRef(target: GemElement, prop: string, ref: string) {
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      const proxy = gemElementProxyMap.get(this);
      let refobject = proxy[prop];
      if (!refobject) {
        const that = this as GemElement;
        const ele = that.shadowRoot || that;
        refobject = {
          get ref() {
            return ref;
          },
          get element() {
            return ele.querySelector(`[ref=${ref}]`) as HTMLElement | null;
          },
        };
        proxy[prop] = refobject;
      }
      return refobject;
    },
  });
}

export function defineCSSState(target: GemElement, prop: string, state: string) {
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      const that = this as GemElement;
      return !!that.internals?.states?.contains(state);
    },
    set(v: boolean) {
      const that = this as GemElement;
      const internals = that.internals;
      if (v) {
        internals.states.add(state);
      } else {
        internals.states.remove(state);
      }
    },
  });
}

export const nativeDefineElement = customElements.define.bind(customElements);
customElements.define = (name: string, cls: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  if (cls.prototype instanceof GemElement) {
    const {
      observedAttributes,
      observedPropertys,
      defineEvents,
      defineCSSStates,
      defineRefs,
    } = (cls as unknown) as typeof GemElement;
    observedAttributes?.forEach((attr) => defineAttribute(cls.prototype, kebabToCamelCase(attr), attr));
    observedPropertys?.forEach((prop) => defineProperty(cls.prototype, prop));
    defineEvents?.forEach((event) => defineProperty(cls.prototype, kebabToCamelCase(event), event));
    defineCSSStates?.forEach((state) => defineCSSState(cls.prototype, kebabToCamelCase(state), state));
    defineRefs?.forEach((ref) => defineRef(cls.prototype, kebabToCamelCase(ref), ref));
  }

  nativeDefineElement(name, cls as CustomElementConstructor, options);
};
