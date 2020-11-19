/* eslint-disable @typescript-eslint/no-empty-function */

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
  camelToKebabCase,
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
const renderTaskPool = new Pool<() => void>();
let loop = false;
const tick = () => {
  window.requestAnimationFrame(function callback(timestamp) {
    const task = renderTaskPool.get();
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
renderTaskPool.addEventListener('start', () => {
  loop = true;
  tick();
});
renderTaskPool.addEventListener('end', () => (loop = false));

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
  static defineEvents?: string[];
  // 用于 Devtools，且只有 ts 装饰器定义才有效
  static defineCSSStates?: string[];
  static defineParts?: string[];
  static defineSlots?: string[];
  static defineRefs?: string[];

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: T;
  // 用于 css 选择器选择元素，使用 @refobject 自动选择获取
  // 必须使用 attr 赋值
  /**@attr ref */
  ref: any;

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

    const { observedAttributes, observedPropertys, defineEvents, adoptedStyleSheets } = new.target;
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map((item) => item[SheetToken] || item);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        throw new GemError('Please mount to ShadowDOM or Document');
      }
    }
    // attr/prop/emitter 定义在为了适配 js 只能在这里定义
    // 如果只支持 ts，则在装饰器中将他们定义在 `prototype` 上是否有性能提升？
    // css state 在装饰器中定义，js 不支持 `defineCSSStates`
    if (observedAttributes) {
      observedAttributes.forEach((attr) => {
        this.#connectAttrbute(attr, new.target);
      });
    }
    if (observedPropertys) {
      observedPropertys.forEach((prop) => {
        this.#connectProperty(prop, false);
      });
    }
    if (defineEvents) {
      defineEvents.forEach((event) => {
        this.#connectProperty(event, true);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this[event] = emptyFunction;
      });
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

  #connectAttrbute = (attr: string, target: typeof GemElement) => {
    const { booleanAttributes, numberAttributes } = target;
    const prop = kebabToCamelCase(attr);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof this[prop] === 'function') {
      throw new GemError(`Don't use attribute with the same name as native methods`);
    }
    // Native attribute，no need difine property
    // e.g: `id`, `title`, `hidden`, `alt`, `lang`
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this[prop] !== undefined) {
      // 所以 `prop` 不能是方法
      return;
    }
    // !!! Custom property shortcut access only supports `string` type
    Object.defineProperty(this, prop, {
      configurable: true,
      get() {
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
  };

  /**
   * 和 `attr` 不一样，只有等 `lit-html` 在已经初始化的元素上设置 `prop` 的值后才能访问模版上的值
   * 即能在类字段（执行在构造函数之后）中直接访问到模版上的 `attr` 而不能访问到 `prop`
   * */
  #connectProperty = (prop: string, isEventHandle = false) => {
    if (prop in this) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let propValue: any = this[prop];
    Object.defineProperty(this, prop, {
      configurable: true,
      get() {
        return propValue;
      },
      set(v) {
        const that = this as GemElement;
        if (v !== propValue) {
          if (isEventHandle) {
            propValue = v?.__isEventHandle
              ? v
              : (detail: any, options: any) => {
                  const evt = new CustomEvent(camelToKebabCase(prop), { detail, ...options });
                  that.dispatchEvent(evt);
                  v(detail, options);
                };
            propValue.__isEventHandle = true;
          } else {
            propValue = v;
          }
          if (that.#isMounted) {
            addMicrotask(that.#update);
          }
        }
      },
    });
  };

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
      renderTaskPool.add(this.#updateCallback);
    } else {
      this.#updateCallback();
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
      renderTaskPool.add(this.#connectedCallback);
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
