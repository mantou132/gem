import { html, render, TemplateResult } from 'lit-html';

import type { GemReflectElement } from '../elements/reflect';

import { connect, Store } from './store';
import {
  LinkedList,
  addMicrotask,
  Sheet,
  SheetToken,
  isArrayChange,
  GemError,
  kebabToCamelCase,
  PropProxyMap,
  removeItems,
} from './utils';
import * as GemExports from './element';
import * as VersionExports from './version';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';

// https://github.com/Polymer/lit-html/issues/1048
export { guard } from 'lit-html/directives/guard';

export { ifDefined } from 'lit-html/directives/if-defined';

declare global {
  interface ElementInternals extends ARIAMixin {
    // https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet
    states: Set<string>;
  }
  // 用于 css 选择器选择元素，使用 @refobject 自动选择获取
  // 必须使用 attr 赋值
  /**
   * @attr ref
   */
  interface HTMLElement {
    ref: string;
  }
}

function emptyFunction() {
  // 用于占位的空函数
}

function execCallback(fun: any) {
  typeof fun === 'function' && fun();
}

// global render task pool
const asyncRenderTaskList = new LinkedList<() => void>();
const tick = (timeStamp = performance.now()) => {
  if (performance.now() > timeStamp + 16) return requestAnimationFrame(tick);
  const task = asyncRenderTaskList.get();
  if (task) {
    task();
    tick(timeStamp);
  }
};
asyncRenderTaskList.addEventListener('start', () => addMicrotask(tick));

type GetDepFun<T> = () => T;
type EffectCallback<T> = (depValues: T, oldDepValues?: T) => any;
type EffectItem<T> = {
  callback: EffectCallback<T>;
  initialized?: boolean;
  inConstructor?: boolean;
  values?: T;
  getDep?: GetDepFun<T>;
  preCallback?: () => void;
};

const constructorSymbol = Symbol('constructor');
const initSymbol = Symbol('init');
const updateSymbol = Symbol('update');

export interface GemElementOptions {
  isLight?: boolean;
  isAsync?: boolean;
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#options
  delegatesFocus?: boolean;
  slotAssignment?: 'named' | 'manual';
}

export abstract class GemElement<T = Record<string, unknown>> extends HTMLElement {
  // 禁止覆盖自定义元素原生生命周期方法
  // https://github.com/microsoft/TypeScript/issues/21388#issuecomment-934345226
  static #final = Symbol();

  // 这里只是字段申明，不能赋值，否则子类会继承被共享该字段
  static observedAttributes?: string[]; // WebAPI 中是实时检查这个列表
  static booleanAttributes?: Set<string>;
  static numberAttributes?: Set<string>;
  static observedProperties?: string[];
  static observedStores?: Store<unknown>[];
  static adoptedStyleSheets?: Sheet<unknown>[];
  static defineEvents?: string[];
  static defineCSSStates?: string[];
  static defineRefs?: string[];
  // 以下静态字段仅供外部读取，没有实际作用
  static defineParts?: string[];
  static defineSlots?: string[];
  // 指定 root 元素类型
  static rootElement?: string;

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: T;

  #renderRoot: HTMLElement | ShadowRoot;
  #internals?: ElementInternals;
  #isAppendReason?: boolean;
  // 和 isConnected 有区别
  #isMounted?: boolean;
  #isAsync?: boolean;
  #effectList?: EffectItem<any>[];
  #memoList?: EffectItem<any>[];
  #unmountCallback?: any;

  constructor({ isAsync, isLight, delegatesFocus, slotAssignment }: GemElementOptions = {}) {
    super();

    // 外部不可见，但允许类外面使用
    addMicrotask(() => Reflect.set(this, initSymbol, false));
    Reflect.set(this, constructorSymbol, true);
    Reflect.set(this, initSymbol, true);
    Reflect.set(this, updateSymbol, () => {
      if (this.#isMounted) {
        addMicrotask(this.#update);
      }
    });

    this.#isAsync = isAsync;
    this.#renderRoot = isLight ? this : this.attachShadow({ mode: 'open', delegatesFocus, slotAssignment });

    const { adoptedStyleSheets } = new.target;
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map((item) => item[SheetToken] || item);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        this.effect(
          () => {
            const root = this.getRootNode() as ShadowRoot | Document;
            root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
            return () => {
              root.adoptedStyleSheets = removeItems(root.adoptedStyleSheets, sheets);
            };
          },
          () => [],
        );
      }
    }
  }

  get internals() {
    if (!this.#internals) {
      this.#internals = this.attachInternals();
      // https://groups.google.com/a/chromium.org/g/blink-dev/c/JvpHoUfhJYE?pli=1
      // https://bugs.webkit.org/show_bug.cgi?id=215911
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1588763
      try {
        this.#internals.states.add('foo');
        this.#internals.states.delete('foo');
      } catch {
        Reflect.defineProperty(this.#internals, 'states', {
          value: {
            has: (v: string) => kebabToCamelCase(v) in this.dataset,
            add: (v: string) => (this.dataset[kebabToCamelCase(v)] = ''),
            delete: (v: string) => delete this.dataset[kebabToCamelCase(v)],
          },
        });
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

  #exec = (list?: EffectItem<any>[]) => {
    list?.forEach((effectItem) => {
      const { callback, getDep, values, preCallback } = effectItem;
      const newValues = getDep?.();
      if (!getDep || !values || isArrayChange(values, newValues)) {
        execCallback(preCallback);
        effectItem.preCallback = callback(newValues, values);
        effectItem.values = newValues;
      }
    });
  };

  /**
   * 每次更新完检查依赖，执行对应的副作用回调
   * */
  #execEffect = () => {
    this.#exec(this.#effectList);
  };

  #execMemo = () => {
    this.#exec(this.#memoList);
  };

  /**
   * @helper
   * 记录副作用回调和值，在 `constructor`/`mounted` 中使用
   * 回调到返回值如果是函数将再卸载时执行
   * 第一次执行时 `oldDeps` 为空
   *
   * ```js
   * class App extends GemElement {
   *   mounted() {
   *     this.effect(callback, () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  effect = <T = any[] | undefined>(callback: EffectCallback<T>, getDep?: T extends any[] ? () => T : undefined) => {
    if (!this.#effectList) this.#effectList = [];
    const effectItem: EffectItem<T> = {
      callback,
      getDep,
      initialized: this.#isMounted,
      inConstructor: (this as any)[constructorSymbol],
    };
    // 以挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.#isMounted) {
      effectItem.values = getDep?.() as T;
      effectItem.preCallback = callback(effectItem.values);
    }
    this.#effectList.push(effectItem);
  };

  /**
   * @helper
   * 在 `render` 前执行回调，和 `effect` 一样接受依赖数组参数，在 `constructor`/`willMount` 中使用;
   * 第一次执行时 `oldDeps` 为空
   *
   * ```js
   * class App extends GemElement {
   *   willMount() {
   *     this.memo(() => {
   *       this.a = exec(this.attrName);
   *     }), () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  memo = <T = any[] | undefined>(callback: EffectCallback<T>, getDep?: T extends any[] ? () => T : undefined) => {
    if (!this.#memoList) this.#memoList = [];
    this.#memoList.push({
      callback,
      getDep,
      inConstructor: (this as any)[constructorSymbol],
    });
  };

  /**
   * 元素挂载后执行还未初始化的副作用
   * */
  #initEffect = () => {
    this.#effectList?.forEach((effectItem) => {
      const { callback, getDep, initialized } = effectItem;
      if (!initialized) {
        effectItem.values = getDep?.();
        effectItem.preCallback = callback(effectItem.values);
        effectItem.initialized = true;
      }
    });
  };

  /**@lifecycle */
  willMount?(): void | Promise<void>;

  /**
   * @lifecycle
   *
   * - 不提供 `render` 时显示子内容
   * - 返回 `null` 时渲染空内容
   * - 返回 `undefined` 时不会调用 `render()`, 也就是不会更新以前的内容
   * */
  render?(): TemplateResult | null | undefined;

  #render = () => {
    this.#execMemo();
    const isLight = this.#renderRoot === this;
    const temp = this.render ? this.render() : isLight ? undefined : html`<slot></slot>`;
    if (temp === undefined) return;
    render(temp, this.#renderRoot);
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
      this.#render();
      addMicrotask(this.#updated);
      addMicrotask(this.#execEffect);
    }
  };

  #update = () => {
    if (this.#isAsync) {
      asyncRenderTaskList.add(this.#updateCallback);
    } else {
      this.#updateCallback();
    }
  };

  /**
   * @helper
   * async
   */
  update = () => {
    addMicrotask(this.#update);
  };

  /**@lifecycle */
  updated?(): void | Promise<void>;
  #updated = () => {
    this.updated?.();
  };

  /**
   * @lifecycle
   *
   * 卸载元素，但不一定会被垃圾回收，所以事件监听器需要手动清除，以免重复注册
   */
  unmounted?(): void | Promise<void>;

  /**
   * @private
   * @final
   * use `effect`
   */
  attributeChangedCallback() {
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
    return GemElement.#final;
  }

  #disconnectStore?: (() => void)[];
  #connectedCallback = () => {
    if (this.#isAppendReason) {
      this.#isAppendReason = false;
      return;
    }

    // 似乎这是最早的判断不在 `constructor` 中的地方
    Reflect.set(this, constructorSymbol, false);

    this.willMount?.();
    const { observedStores, rootElement } = this.constructor as typeof GemElement;
    this.#disconnectStore = observedStores?.map((store) => connect(store, this.#update));
    this.#render();
    this.#isMounted = true;
    this.#unmountCallback = this.mounted?.();
    this.#initEffect();
    if (
      rootElement &&
      this.isConnected &&
      (this.getRootNode() as ShadowRoot).host?.tagName !== rootElement.toUpperCase()
    ) {
      throw new GemError(`not allow current root type`);
    }
  };

  closestElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] | null;
  closestElement<K extends abstract new (...args: any) => any>(constructor: K): InstanceType<K> | null;
  closestElement<K extends abstract new (...args: any) => any>(constructorOrTag: K | string): Element | null {
    const isConstructor = typeof constructorOrTag === 'function';
    const tagName = typeof constructorOrTag === 'string' && constructorOrTag.toUpperCase();
    const getRootElement = (ele: Element): Element | null => {
      const rootEle = ele.parentElement || (ele.getRootNode() as ShadowRoot).host;
      if (!rootEle) return null;
      if (isConstructor) {
        if (rootEle.constructor === constructorOrTag) {
          return rootEle;
        }
      } else if (rootEle.tagName === tagName) {
        return rootEle;
      }
      return getRootElement(rootEle);
    };
    return getRootElement(this);
  }

  /**
   * @private
   * @final
   * use `mounted`; 允许手动调用 `connectedCallback` 以清除装饰器定义的字段
   */
  connectedCallback() {
    if (this.isConnected && this.#isAsync) {
      asyncRenderTaskList.add(this.#connectedCallback);
    } else {
      this.#connectedCallback();
    }
    return GemElement.#final;
  }

  /**
   * @private
   * @final
   */
  adoptedCallback() {
    return GemElement.#final;
  }

  /**
   * @private
   * @final
   * use `unmounted`
   */
  disconnectedCallback() {
    if (this.isConnected) {
      this.#isAppendReason = true;
      return;
    }
    this.#isMounted = false;
    this.#disconnectStore?.forEach((disconnect) => disconnect());
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList?.forEach(({ preCallback }) => execCallback(preCallback));
    this.#effectList = this.#effectList?.filter(this.#filterEffect);
    this.#memoList = this.#memoList?.filter(this.#filterEffect);
    return GemElement.#final;
  }

  #filterEffect = (e: EffectItem<any>) => {
    e.initialized = false;
    return e.inConstructor;
  };
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
      const proxy = gemElementProxyMap.get(this);
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
      const proxy = gemElementProxyMap.get(that);
      if (v !== proxy[prop]) {
        if (event) {
          proxy[prop] = v?.[isEventHandleSymbol]
            ? v
            : (detail: any, options: any) => {
                const evt = new CustomEvent(event, { ...options, ...eventOptions, detail });
                that.dispatchEvent(evt);
                v(detail, options);
              };
          Reflect.set(proxy[prop]!, isEventHandleSymbol, true);
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
            const gemReflects = ([...ele.querySelectorAll('[data-gem-reflect]')] as GemReflectElement[]).map(
              (e) => e.target,
            );
            for (const e of [ele, ...gemReflects]) {
              const result = e.querySelector(`[ref=${ref}]`);
              if (result) return result;
            }
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
      const { states } = that.internals;
      return states?.has(state);
    },
    set(v: boolean) {
      const that = this as GemElement;
      const { states } = that.internals;
      if (v) {
        states?.add(state);
      } else {
        states?.delete(state);
      }
    },
  });
}

export const nativeDefineElement = customElements.define.bind(customElements);
customElements.define = (name: string, cls: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  if (cls.prototype instanceof GemElement) {
    const { observedAttributes, observedProperties, defineEvents, defineCSSStates, defineRefs } =
      cls as unknown as typeof GemElement;
    observedAttributes?.forEach((attr) => defineAttribute(cls.prototype, kebabToCamelCase(attr), attr));
    observedProperties?.forEach((prop) => defineProperty(cls.prototype, prop));
    defineEvents?.forEach((event) => defineProperty(cls.prototype, kebabToCamelCase(event), event));
    defineCSSStates?.forEach((state) => defineCSSState(cls.prototype, kebabToCamelCase(state), state));
    defineRefs?.forEach((ref) => defineRef(cls.prototype, kebabToCamelCase(ref), ref));
  }

  nativeDefineElement(name, cls, options);
};

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?: (typeof GemExports & typeof VersionExports) | Record<string, never>;
  }
}

if (window.__GEM_DEVTOOLS__HOOK__) {
  Object.assign(window.__GEM_DEVTOOLS__HOOK__, { ...GemExports, ...VersionExports });
}
