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
  addListener,
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
  // https://dom.spec.whatwg.org/#shadowroot-clonable
  interface ShadowRootInit {
    clonable?: boolean;
    serializable?: boolean;
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

const updateSymbol = Symbol('update');

export interface GemElementOptions extends Partial<ShadowRootInit> {
  isLight?: boolean;
  isAsync?: boolean;
  focusable?: boolean;
}

export abstract class GemElement<T = Record<string, unknown>> extends HTMLElement {
  // 禁止覆盖自定义元素原生生命周期方法
  // https://github.com/microsoft/TypeScript/issues/21388#issuecomment-934345226
  static #final = Symbol();

  // 指定 root 元素类型
  static rootElement?: string;
  // 实例化时使用到
  static observedStores?: Store<unknown>[];
  static adoptedStyleSheets?: Sheet<unknown>[];
  // 以下静态字段仅供外部读取，没有实际作用
  static observedProperties?: string[];
  static observedAttributes?: string[]; // 必须在定义元素前指定
  static definedEvents?: string[];
  static definedCSSStates?: string[];
  static definedRefs?: string[];
  static definedParts?: string[];
  static definedSlots?: string[];

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: T;

  #renderRoot: HTMLElement | ShadowRoot;
  #internals?: ElementInternals;
  #isAppendReason?: boolean;
  // 和 isConnected 有区别
  #isMounted?: boolean;
  #isConnected?: boolean;
  #isAsync?: boolean;
  #effectList?: EffectItem<any>[];
  #memoList?: EffectItem<any>[];
  #unmountCallback?: any;

  [updateSymbol]() {
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
  }

  constructor(options: GemElementOptions = {}) {
    super();

    this.#isAsync = options.isAsync;
    this.#renderRoot = options.isLight
      ? this
      : this.attachShadow({
          mode: options.mode || 'open',
          serializable: options.serializable ?? true,
          delegatesFocus: options.delegatesFocus,
          slotAssignment: options.slotAssignment,
        });

    // https://stackoverflow.com/questions/43836886/failed-to-construct-customelement-error-when-javascript-file-is-placed-in-head
    // focusable 元素一般同时具备 disabled 属性
    // 和原生元素行为保持一致，disabled 时不触发 click 事件
    let hasInitTabIndex: boolean | undefined;
    this.effect(
      ([disabled = false]) => {
        if (hasInitTabIndex === undefined) hasInitTabIndex = this.hasAttribute('tabindex');

        this.internals.ariaDisabled = String(disabled);

        if (options.focusable && !hasInitTabIndex) {
          this.tabIndex = -Number(disabled);
        }

        if ((options.focusable || options.delegatesFocus) && disabled) {
          return addListener(this, 'click', (e: Event) => e.isTrusted && e.stopImmediatePropagation(), {
            capture: true,
          });
        }
      },
      () => [Reflect.get(this, 'disabled')],
    );

    const { adoptedStyleSheets } = new.target;
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map((item) => item[SheetToken] || item);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        this.effect(
          () => {
            const root = this.getRootNode() as ShadowRoot | Document;
            root.adoptedStyleSheets.push(...sheets);
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
   * 记录副作用回调和值，在 `constructor`/`mounted` 中使用；
   * 回调到返回值如果是函数将再卸载时执行；
   * 第一次执行时 `oldDeps` 为空；
   *
   * ```js
   * class App extends GemElement {
   *   mounted() {
   *     this.effect(callback, () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  effect = <K = any[] | undefined>(callback: EffectCallback<K>, getDep?: K extends any[] ? () => K : undefined) => {
    if (!this.#effectList) this.#effectList = [];
    const effectItem: EffectItem<K> = {
      callback,
      getDep,
      initialized: this.#isMounted,
      inConstructor: !this.#isConnected,
    };
    // 以挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.#isMounted) {
      effectItem.values = getDep?.() as K;
      effectItem.preCallback = callback(effectItem.values);
    }
    this.#effectList.push(effectItem);
  };

  /**
   * @helper
   * 在 `render` 前执行回调，不要在里面使用 `setState`；
   * 和 `effect` 一样接受依赖数组参数，在 `constructor`/`willMount` 中使用;
   * 第一次执行时 `oldDeps` 为空；
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
  memo = <K = any[] | undefined>(callback: EffectCallback<K>, getDep?: K extends any[] ? () => K : undefined) => {
    if (!this.#memoList) this.#memoList = [];
    this.#memoList.push({
      callback,
      getDep,
      inConstructor: !this.#isConnected,
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

    const { observedStores, rootElement } = this.constructor as typeof GemElement;

    this.#isConnected = true;
    this.willMount?.();
    this.#disconnectStore = observedStores?.map((store) => connect(store, this.#update));
    this.#render();
    this.#isMounted = true;
    this.#unmountCallback = this.mounted?.();
    this.#initEffect();
    if (rootElement && (this.getRootNode() as ShadowRoot).host?.tagName !== rootElement.toUpperCase()) {
      throw new GemError(`not allow current root type`);
    }
  };

  closestElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] | null;
  closestElement<K extends abstract new (...args: any) => any>(constructor: K): InstanceType<K> | null;
  closestElement<K extends abstract new (...args: any) => any>(constructorOrTag: K | string) {
    const isConstructor = typeof constructorOrTag === 'function';
    const tagName = typeof constructorOrTag === 'string' && constructorOrTag.toUpperCase();
    const is = (ele: Element) => (isConstructor ? ele.constructor === constructorOrTag : ele.tagName === tagName);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Element | null = this;
    while (node) {
      if (is(node)) break;
      node = node.parentElement || (node.getRootNode() as ShadowRoot).host;
    }
    return node;
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
    this.#effectList = this.#clearEffect(this.#effectList);
    this.#memoList = this.#clearEffect(this.#memoList);
    return GemElement.#final;
  }

  #clearEffect = (list?: EffectItem<any>[]) => {
    return list?.filter((e) => {
      execCallback(e.preCallback);
      e.initialized = false;
      return e.inConstructor;
    });
  };
}

const gemElementProxyMap = new PropProxyMap<GemElement>();
type GemElementPrototype = GemElement<any>;

type DefinePropertyOptions = {
  attr?: string;
  attrType?: (v?: any) => any;
  event?: string;
  eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>;
};
const isEventHandleSymbol = Symbol('event handle');
export function defineProperty(
  target: GemElementPrototype,
  prop: string,
  { attr, attrType, event, eventOptions }: DefinePropertyOptions = {},
) {
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      const value = gemElementProxyMap.get(this)[prop];
      if (event && !value) {
        this[prop] = emptyFunction;
        return this[prop];
      }
      return value;
    },
    set(v) {
      const that = this as GemElement;
      const proxy = gemElementProxyMap.get(that);
      if (attr) {
        const { removeAttribute, setAttribute } = Element.prototype;
        v = attrType === Boolean && v === '' ? true : attrType!(v || '');
        if (!v) {
          removeAttribute.call(this, attr);
        } else {
          setAttribute.call(this, attr, attrType === Boolean ? '' : v);
        }
      }
      if (v === proxy[prop]) return;
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
    },
  });
}

const getReflectTargets = (ele: ShadowRoot | GemElement) =>
  [...ele.querySelectorAll<GemReflectElement>('[data-gem-reflect]')].map((e) => e.target);

export function defineRef(target: GemElement, prop: string, ref: string) {
  const refSelector = `[ref=${ref}]`;
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
            for (const e of [ele, ...getReflectTargets(ele)]) {
              const result = e.querySelector(refSelector);
              if (result) return result;
            }
          },
          get elements() {
            return [ele, ...getReflectTargets(ele)].map((e) => [...e.querySelectorAll(refSelector)]).flat();
          },
        };
        proxy[prop] = refobject;
      }
      return refobject;
    },
    set() {
      //
    },
  });
}

export function defineCSSState(target: GemElementPrototype, prop: string, state: string) {
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

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?: (typeof GemExports & typeof VersionExports) | Record<string, never>;
  }
}

if (window.__GEM_DEVTOOLS__HOOK__) {
  Object.assign(window.__GEM_DEVTOOLS__HOOK__, { ...GemExports, ...VersionExports });
}
