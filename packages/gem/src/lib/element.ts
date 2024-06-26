import { html, render, TemplateResult } from 'lit-html';

import { connect, Store } from './store';
import {
  LinkedList,
  addMicrotask,
  Sheet,
  SheetToken,
  isArrayChange,
  GemError,
  removeItems,
  addListener,
} from './utils';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';

const { get } = Reflect;

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

export const gemSymbols = {
  // 禁止覆盖自定义元素原生生命周期方法
  // https://github.com/microsoft/TypeScript/issues/21388#issuecomment-934345226
  final: Symbol(),
  update: Symbol(),
  // 指定 root 元素类型
  rootElement: Symbol(),
  // 实例化时使用到，DevTools 需要读取
  observedStores: Symbol.for('gem@observedStores'),
  adoptedStyleSheets: Symbol.for('gem@adoptedStyleSheets'),
  sheetToken: SheetToken,
  // 以下静态字段仅供外部读取，没有实际作用
  observedProperties: Symbol(),
  observedAttributes: Symbol(), // 必须在定义元素前指定
  definedEvents: Symbol(),
  definedCSSStates: Symbol(),
  definedRefs: Symbol(),
  definedParts: Symbol(),
  definedSlots: Symbol(),
};

export interface GemElementOptions extends Partial<ShadowRootInit> {
  isLight?: boolean;
  isAsync?: boolean;
  focusable?: boolean;
}

export abstract class GemElement<T = Record<string, unknown>> extends HTMLElement {
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

  [gemSymbols.update]() {
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
      () => [get(this, 'disabled')],
    );

    const adoptedStyleSheets = get(new.target, gemSymbols.adoptedStyleSheets) as Sheet<unknown>[] | undefined;
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

  #disconnectStore?: (() => void)[];
  #connectedCallback = () => {
    if (this.#isAppendReason) {
      this.#isAppendReason = false;
      return;
    }

    const observedStores = get(this.constructor, gemSymbols.observedStores) as Store<unknown>[] | undefined;
    const rootElement = get(this.constructor, gemSymbols.rootElement) as string | undefined;

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
    return gemSymbols.final;
  }

  /**
   * @private
   * @final
   */
  adoptedCallback() {
    return gemSymbols.final;
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
    asyncRenderTaskList.delete(this.#connectedCallback);
    asyncRenderTaskList.delete(this.#updateCallback);
    this.#isMounted = false;
    this.#disconnectStore?.forEach((disconnect) => disconnect());
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList = this.#clearEffect(this.#effectList);
    this.#memoList = this.#clearEffect(this.#memoList);
    return gemSymbols.final;
  }

  #clearEffect = (list?: EffectItem<any>[]) => {
    return list?.filter((e) => {
      execCallback(e.preCallback);
      e.initialized = false;
      return e.inConstructor;
    });
  };
}
