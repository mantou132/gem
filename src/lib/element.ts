import { html, render, TemplateResult } from 'lit-html';
import { connect, disconnect, Store } from './store';
import { Pool, addMicrotask, Sheet, SheetToken, isArrayChange, GemError, kebabToCamelCase } from './utils';

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
  values: T;
  getDep: GetDepFun<T>;
  initialized: boolean;
  preCallback?: () => void;
};

// gem 元素如果设置 attr 默认值，那么 `cloneNode` 的 attr 始终等于默认值 https://github.com/whatwg/dom/issues/922
export abstract class GemElement<T = Record<string, unknown>> extends HTMLElement {
  // 这里只是字段申明，不能赋值，否则子类会继承被共享该字段
  static observedAttributes?: string[]; // WebAPI 中是实时检查这个列表
  static booleanAttributes?: Set<string>;
  static numberAttributes?: Set<string>;
  static observedPropertys?: string[];
  static observedStores?: Store<unknown>[];
  static adoptedStyleSheets?: Sheet<unknown>[];
  // 以下静态字段仅供外部读取，没有实际作用
  static defineEvents?: string[];
  static defineCSSStates?: string[];
  static defineParts?: string[];
  static defineSlots?: string[];
  static defineRefs?: string[];

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

    this.#isAsync = options?.isAsync;
    this.#renderRoot = options?.isLight ? this : this.attachShadow({ mode: 'open' });

    const { defineEvents, adoptedStyleSheets } = new.target;
    if (defineEvents) {
      defineEvents.forEach((event) => {
        const that = this as any;
        that[kebabToCamelCase(event)] = emptyFunction;
      });
    }
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
   * @example
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
      const newValues = getDep();
      if (isArrayChange(values, newValues)) {
        execCallback(preCallback);
        effectItem.preCallback = callback(newValues);
        effectItem.values = newValues;
      }
    });
  };

  /**
   * @helper
   * 记录副作用回调和值
   *
   * @example
   * ```js
   * class App extends GemElement {
   *   mounted() {
   *     this.effect(callback, () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  effect = <T extends Array<any>>(callback: EffectCallback<T>, getDep: () => [...T]) => {
    if (!this.#effectList) this.#effectList = [];
    const values = getDep();
    const effectItem: EffectItem<T> = { callback, getDep, values, initialized: !!this.#isMounted };
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
        effectItem.preCallback = callback(getDep());
        effectItem.initialized = true;
      }
    });
  };

  /**@lifecycle */
  willMount?(): void;

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
  mounted?(): void | (() => void);

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

  __update = () => {
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
  };

  /**@helper */
  update = () => {
    this.#update();
  };

  /**@lifecycle */
  updated?(): void;
  #updated = () => {
    this.updated?.();
  };

  /**@lifecycle */
  unmounted?(): void;

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
    if (observedStores) {
      observedStores.forEach((store) => {
        connect(store, this.#update);
      });
    }
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
    if (observedStores) {
      observedStores.forEach((store) => {
        disconnect(store, this.#update);
      });
    }
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList?.forEach((effectItem) => {
      execCallback(effectItem.preCallback);
    });
  }
}

export function defineAttribute(target: GemElement, prop: string, attr: string) {
  const { booleanAttributes, numberAttributes } = target.constructor as typeof GemElement;
  const prototype = target as any;
  if (typeof prototype[prop] === 'function') {
    throw new GemError(`Don't use attribute with the same name as native methods`);
  }
  // Native attribute，no need difine property
  // e.g: `id`, `title`, `hidden`, `alt`, `lang`
  if (prototype[prop] !== undefined) {
    return;
  }
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      // fix karma test
      if (Object.getPrototypeOf(this) !== target) return;
      const that = this as GemElement;
      const value = that.getAttribute(attr);
      if (booleanAttributes?.has(attr)) {
        return value === null ? false : true;
      }
      if (numberAttributes?.has(attr)) {
        return Number(value);
      }
      // Return empty string if attribute does not exist
      return this.getAttribute(attr) || '';
    },
    set(v: string | null | undefined | number | boolean) {
      const isBool = booleanAttributes?.has(attr);
      if (v === null || v === undefined || (isBool && !v)) {
        this.removeAttribute(attr);
      } else if (isBool && v) {
        this.setAttribute(attr, '');
      } else {
        this.setAttribute(attr, v);
      }
    },
  });
}

const isEventHandleSymbol = Symbol('event handle');
export function defineProperty(target: GemElement, prop: string, event?: string) {
  if (prop in target) return;
  let propValue: any = undefined;
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      return propValue;
    },
    set(v) {
      const that = this as GemElement;
      if (v !== propValue) {
        if (event) {
          propValue = v?.[isEventHandleSymbol]
            ? v
            : (detail: any, options: any) => {
                const evt = new CustomEvent(event, { detail, ...options });
                that.dispatchEvent(evt);
                v(detail, options);
              };
          propValue[isEventHandleSymbol] = true;
        } else {
          propValue = v;
        }
        that.__update();
      }
    },
  });
}

export function defineCSSState(target: GemElement, prop: string, attr: string) {
  Object.defineProperty(target, prop, {
    configurable: true,
    get() {
      const that = this as GemElement;
      return !!that.internals?.states?.contains(attr);
    },
    set(v: boolean) {
      const that = this as GemElement;
      const internals = that.internals;
      if (v) {
        internals.states.add(attr);
      } else {
        internals.states.remove(attr);
      }
    },
  });
}

export const nativeDefineElement = customElements.define.bind(customElements);
customElements.define = (name: string, cls: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  const {
    observedAttributes,
    observedPropertys,
    defineEvents,
    defineCSSStates,
  } = (cls as unknown) as typeof GemElement;
  if (observedAttributes) {
    observedAttributes.forEach((attr) => defineAttribute(cls.prototype, kebabToCamelCase(attr), attr));
  }
  if (observedPropertys) {
    observedPropertys.forEach((prop) => defineProperty(cls.prototype, prop));
  }
  if (defineEvents) {
    defineEvents.forEach((event) => defineProperty(cls.prototype, kebabToCamelCase(event), event));
  }
  if (defineCSSStates) {
    defineCSSStates.forEach((state) => defineCSSState(cls.prototype, kebabToCamelCase(state), state));
  }
  nativeDefineElement(name, cls as CustomElementConstructor, options);
};
