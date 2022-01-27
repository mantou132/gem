import { html, render, TemplateResult } from 'lit-html';

import type { GemReflectElement } from '../elements/reflect';

import { connect, disconnect, Store } from './store';
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
  useNativeCSSStyleSheet,
} from './utils';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';

// https://github.com/Polymer/lit-html/issues/1048
export { guard } from 'lit-html/directives/guard';

export { ifDefined } from 'lit-html/directives/if-defined';

type CustomStateSet = Set<string>;

declare global {
  interface ElementInternals extends ARIAMixin {
    states: CustomStateSet;
    // https://w3c.github.io/aria/#role_definitions
    role?: string;
  }
  // 用于 css 选择器选择元素，使用 @refobject 自动选择获取
  // 必须使用 attr 赋值
  /**
   * @attr ref
   * @attr inert
   */
  interface HTMLElement {
    attachInternals: () => ElementInternals;
    inert: boolean;
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
  initialized: boolean;
  values?: T;
  getDep?: GetDepFun<T>;
  preCallback?: () => void;
};

const initSymbol = Symbol('init');
const updateSymbol = Symbol('update');

export interface GemElementOptions {
  isLight?: boolean;
  isAsync?: boolean;
  delegatesFocus?: boolean;
}

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
  // 指定 root 元素类型
  static rootElement?: string;

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: T;

  #renderRoot: HTMLElement | ShadowRoot;
  #internals?: ElementInternals;
  #isAppendReason?: boolean;
  #isAsync?: boolean;
  #effectList?: EffectItem<any>[];
  #momeList?: EffectItem<any>[];
  #unmountCallback?: any;

  constructor({ isAsync, isLight, delegatesFocus }: GemElementOptions = {}) {
    super();

    // 外部不可见，但允许类外面使用
    addMicrotask(() => ((this as any)[initSymbol] = false));
    (this as any)[initSymbol] = true;
    (this as any)[updateSymbol] = () => {
      if (this.isConnected) {
        addMicrotask(this.#update);
      }
    };

    this.#isAsync = isAsync;
    this.#renderRoot = isLight ? this : this.attachShadow({ mode: 'open', delegatesFocus });

    const { adoptedStyleSheets } = new.target;
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map((item) => item[SheetToken] || item);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        this.effect(
          () => {
            const root = this.getRootNode() as ShadowRoot | Document;
            if (!useNativeCSSStyleSheet) {
              const ele: any = root === document ? document.body : root;
              ele._sheets = ele._sheets || {};
              sheets.forEach(({ style, media }: any) => {
                if (ele._sheets[style]) {
                  ele._sheets[style].count++;
                } else {
                  const s = document.createElement('style');
                  s.innerHTML = style;
                  s.media = media.mediaText;
                  ele.append(s);
                  ele._sheets[style] = { ele: s, count: 1 };
                }
              });
              return () => {
                sheets.forEach(({ style }: any) => {
                  ele._sheets[style].count--;
                  if (!ele._sheets[style].count) {
                    delete ele._sheets[style];
                  }
                });
              };
            } else {
              root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
              return () => {
                root.adoptedStyleSheets = removeItems(root.adoptedStyleSheets, sheets);
              };
            }
          },
          () => [],
        );
      }
    }
  }

  get internals() {
    if (!this.#internals) {
      const getCustomStateSet = () => {
        // https://wicg.github.io/custom-state-pseudo-class/
        const getV = (v: string) => v.replace(/-/g, '');
        return {
          has: (v) => getV(v) in this.dataset,
          add: (v) => {
            this.dataset[getV(v)] = '';
          },
          delete: (v) => delete this.dataset[getV(v)],
        } as CustomStateSet;
      };
      if (!this.attachInternals) {
        // https://bugs.webkit.org/show_bug.cgi?id=197960
        this.attachInternals = () => {
          return { states: getCustomStateSet() } as any;
        };
      }
      this.#internals = this.attachInternals();
      if (!this.#internals.states) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1588763
        this.#internals.states = getCustomStateSet();
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
    this.#exec(this.#momeList);
  };

  /**
   * @helper
   * 记录副作用回调和值，在 `constructor`/`mounted` 中使用
   * 回调到返回值如果是函数将再卸载时执行
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
    const effectItem: EffectItem<T> = {
      callback,
      getDep,
      values: undefined,
      initialized: !!this.isConnected,
    };
    // 以挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.isConnected) {
      effectItem.values = getDep?.() as T;
      effectItem.preCallback = callback(effectItem.values);
    }
    this.#effectList.push(effectItem);
  };

  /**
   * @helper
   * 在 `render` 前执行回调，和 `effect` 一样接受依赖数组参数，在 `constructor`/`willMount` 中使用
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
  memo = <T = any[] | undefined>(callback: EffectCallback<T>, getDep?: T extends any[] ? () => [...T] : undefined) => {
    if (!this.#momeList) this.#momeList = [];
    this.#momeList.push({
      callback,
      getDep,
      values: [Symbol()],
      // 是否是 `willMount` 中定义
      initialized: this.isConnected,
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
   * 返回 null 时渲染 lit-html 定义的空内容
   * 返回 undefined 时不会调用 `render()`
   * */
  render?(): TemplateResult | null | undefined;

  #render = () => {
    this.#execMemo();
    const styles = useNativeCSSStyleSheet
      ? ''
      : html`${this.shadowRoot?.adoptedStyleSheets?.map(
          (e: any) =>
            html`
              <style media=${e.media.mediaText}>
                ${e.style}
              </style>
            `,
        )}`;
    if (this.render) return html`${this.render()}${styles}`;
    return this.#renderRoot === this ? undefined : html`<slot></slot>${styles}`;
  };

  /**@lifecycle */
  mounted?(): void | (() => void) | Promise<void>;

  /**@lifecycle */
  shouldUpdate?(): boolean;
  #shouldUpdate = () => {
    return this.shouldUpdate ? this.shouldUpdate() : true;
  };

  #updateCallback = () => {
    if (this.isConnected && this.#shouldUpdate()) {
      const temp = this.#render();
      temp !== undefined && render(temp, this.#renderRoot);
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
    if (this.isConnected) {
      addMicrotask(this.#update);
    }
  }

  #connectedCallback = () => {
    if (this.#isAppendReason) {
      this.#isAppendReason = false;
      return;
    }
    this.willMount?.();
    const { observedStores, rootElement } = this.constructor as typeof GemElement;
    observedStores?.forEach((store) => {
      connect(store, this.#update);
    });
    const temp = this.#render();
    temp !== undefined && render(temp, this.#renderRoot);
    this.#unmountCallback = this.mounted?.();
    this.#initEffect();
    if (rootElement && (this.getRootNode() as ShadowRoot).host?.tagName !== rootElement.toUpperCase()) {
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
   * use `mounted`
   */
  connectedCallback() {
    if (this.#isAsync) {
      asyncRenderTaskList.add(this.#connectedCallback);
    } else {
      this.#connectedCallback();
    }
  }

  /**
   * @private
   * @final
   */
  // adoptedCallback() {}

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
    const { observedStores } = this.constructor as typeof GemElement;
    observedStores?.forEach((store) => {
      disconnect(store, this.#update);
    });
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList?.forEach((effectItem) => {
      execCallback(effectItem.preCallback);
    });
    this.#momeList = this.#momeList?.filter(({ initialized }) => !initialized);
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
            const gemReflects = ([...ele.querySelectorAll('gem-reflect')] as GemReflectElement[]).map((e) => e.target);
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
      return states.has?.(state);
    },
    set(v: boolean) {
      const that = this as GemElement;
      const { states } = that.internals;
      if (v) {
        states.add(state);
      } else {
        states.delete(state);
      }
    },
  });
}

export const nativeDefineElement = customElements.define.bind(customElements);
customElements.define = (name: string, cls: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  if (cls.prototype instanceof GemElement) {
    const { observedAttributes, observedPropertys, defineEvents, defineCSSStates, defineRefs } =
      cls as unknown as typeof GemElement;
    observedAttributes?.forEach((attr) => defineAttribute(cls.prototype, kebabToCamelCase(attr), attr));
    observedPropertys?.forEach((prop) => defineProperty(cls.prototype, prop));
    defineEvents?.forEach((event) => defineProperty(cls.prototype, kebabToCamelCase(event), event));
    defineCSSStates?.forEach((state) => defineCSSState(cls.prototype, kebabToCamelCase(state), `--${state}`));
    defineRefs?.forEach((ref) => defineRef(cls.prototype, kebabToCamelCase(ref), ref));
  }

  nativeDefineElement(name, cls as CustomElementConstructor, options);
};
