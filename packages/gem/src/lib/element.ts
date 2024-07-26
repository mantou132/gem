import { html, render, TemplateResult } from 'lit-html';

import { connect, Store } from './store';
import { LinkedList, addMicrotask, Sheet, SheetToken, isArrayChange, GemError, addListener } from './utils';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';

declare global {
  // 用于 css 选择器选择元素，使用 @refobject 自动选择获取
  // 必须使用 attr 赋值
  /**
   * @attr ref
   */
  interface HTMLElement {
    ref: string;
  }
  interface DOMStringMap {
    // 手动设置 'false' 让自定义元素不作为样式边界
    styleScope?: 'false' | '';
    gemReflect?: '';
    [name: string]: string | undefined;
  }
  // https://github.com/tc39/proposal-decorator-metadata
  interface SymbolConstructor {
    readonly metadata: symbol;
  }
}
const { assign, defineProperty } = Object;

defineProperty(Symbol, 'metadata', { value: Symbol.for('Symbol.metadata') });

function execCallback(fun: any) {
  typeof fun === 'function' && fun();
}

// global render task pool
const noBlockingTaskList = new LinkedList<() => void>();
const tick = (timeStamp = performance.now()) => {
  if (performance.now() > timeStamp + 16) return requestAnimationFrame(tick);
  const task = noBlockingTaskList.get();
  if (task) {
    task();
    tick(timeStamp);
  }
};
noBlockingTaskList.addEventListener('start', () => addMicrotask(tick));

const rootStyleSheetInfo = new WeakMap<Document | ShadowRoot, Map<CSSStyleSheet, number>>();
const rootUpdateFnMap = new WeakMap<Map<CSSStyleSheet, number>, () => void>();

const updateStyleSheets = (map: Map<CSSStyleSheet, number>, sheets: CSSStyleSheet[], value: number) => {
  let needUpdate = false;
  sheets.forEach((e) => {
    const count = map.get(e) || 0;
    needUpdate ||= (value === 1 && count === 0) || (value === -1 && count === 1);
    // count 为 0 时不立即删除，以便更新时识别是否外部样式
    // 但是只要挂载 document 的样式表就不会被 GC 了, 是否要在闲时 GC？
    map.set(e, count + value);
  });
  if (needUpdate) {
    // 避免重复更新，例如 list 元素增删，全 light dom 时 document 更新
    addMicrotask(rootUpdateFnMap.get(map)!);
  }
};

export function appleCSSStyleSheet(ele: HTMLElement, sheets: CSSStyleSheet[]) {
  const root = ele.getRootNode() as ShadowRoot | Document;
  if (!rootStyleSheetInfo.has(root)) {
    const map = new Map<CSSStyleSheet, number>();
    rootStyleSheetInfo.set(root, map);
    rootUpdateFnMap.set(map, () => {
      // 先找到外部样式表
      const newSheets = root.adoptedStyleSheets.filter((e) => !map.has(e));
      map.forEach((count, sheet) => count && newSheets.push(sheet));
      // 外层元素的样式要放到最后，以提升优先级，但是只考虑第一次出现样式表的位置
      root.adoptedStyleSheets = newSheets.reverse();
    });
  }

  const map = rootStyleSheetInfo.get(root)!;

  updateStyleSheets(map, sheets, 1);
  return () => updateStyleSheets(map, sheets, -1);
}

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

// proto prop
export const UpdateToken = Symbol.for('gem@update');
// fix modal-factory type error
const updateTokenAlias = UpdateToken;

export type Metadata = Partial<ShadowRootInit> & {
  noBlocking?: boolean;
  focusable?: boolean;
  aria?: Partial<ARIAMixin>;
  // 指定 root 元素类型
  rootElement?: string;
  // 实例化时使用到，DevTools 需要读取
  observedStores: Store<unknown>[];
  adoptedStyleSheets?: Sheet<unknown>[];
  // 以下静态字段仅供外部读取，没有实际作用
  observedProperties?: string[];
  observedAttributes?: string[];
  definedEvents?: string[];
  definedCSSStates?: string[];
  definedRefs?: string[];
  definedParts?: string[];
  definedSlots?: string[];
};

export abstract class GemElement<State = Record<string, unknown>> extends HTMLElement {
  // 禁止覆盖自定义元素原生生命周期方法
  // https://github.com/microsoft/TypeScript/issues/21388#issuecomment-934345226
  static #final = Symbol();

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state?: State;

  #renderRoot: HTMLElement | ShadowRoot;
  #internals: ElementInternals;
  #isAppendReason?: boolean;
  // 和 isConnected 有区别
  #isMounted?: boolean;
  #isConnected?: boolean;
  #effectList?: EffectItem<any>[];
  #rendering?: boolean;
  #memoList?: EffectItem<any>[];
  #unmountCallback?: any;
  #clearStyle?: any;

  [updateTokenAlias]() {
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
  }

  constructor() {
    super();

    const { mode, serializable, delegatesFocus, slotAssignment, focusable, aria } = this.#metadata;

    this.#renderRoot = !mode ? this : this.attachShadow({ mode, serializable, delegatesFocus, slotAssignment });
    this.#internals = this.attachInternals();

    // https://stackoverflow.com/questions/43836886/failed-to-construct-customelement-error-when-javascript-file-is-placed-in-head
    // focusable 元素一般同时具备 disabled 属性
    // 和原生元素行为保持一致，disabled 时不触发 click 事件
    let hasInitTabIndex: boolean | undefined;
    this.effect(
      ([disabled = false]) => {
        if (hasInitTabIndex === undefined) hasInitTabIndex = this.hasAttribute('tabindex');

        this.#internals.ariaDisabled = String(disabled);

        if (focusable && !hasInitTabIndex) {
          this.tabIndex = -Number(disabled);
        }

        if ((focusable || delegatesFocus) && disabled) {
          return addListener(this, 'click', (e: Event) => e.isTrusted && e.stopImmediatePropagation(), {
            capture: true,
          });
        }
      },
      () => [(this as any).disabled],
    );

    assign(this.#internals, aria);
  }

  get #metadata(): Metadata {
    return (this.constructor as any)[Symbol.metadata];
  }

  get internals() {
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
  setState = (payload: Partial<State>) => {
    if (!this.state) throw new GemError('`state` not initialized');
    assign(this.state, payload);
    // 避免无限刷新
    if (!this.#rendering) addMicrotask(this.#update);
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
   * 在 `render` 前执行回调；
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

  /**
   * @lifecycle
   */
  willMount?(): void | Promise<void>;

  /**
   * @lifecycle
   *
   * - 不提供 `render` 时显示子内容
   * - 返回 `null` 时渲染空的子内容
   * - 返回 `undefined` 时不会调用 `render()`, 也就是不会更新以前的内容
   * */
  render?(): TemplateResult | null | undefined;

  #render = () => {
    this.#rendering = true;
    this.#execMemo();
    const isLight = this.#renderRoot === this;
    const temp = this.render ? this.render() : isLight ? undefined : html`<slot></slot>`;
    this.#rendering = false;
    if (temp === undefined) return;
    render(temp, this.#renderRoot);
  };

  /**
   * @lifecycle
   */
  mounted?(): void | (() => void) | Promise<void>;

  /**
   * @lifecycle
   */
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
    if (this.#metadata.noBlocking) {
      noBlockingTaskList.add(this.#updateCallback);
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

  /**
   * @lifecycle
   */
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

  #prepareStyle = () => {
    const { adoptedStyleSheets } = this.#metadata;

    const { shadowRoot } = this.#internals;
    // 阻止其他元素应用样式到当前元素
    if (!shadowRoot && !this.dataset.styleScope) this.dataset.styleScope = '';
    // 依赖 `dataset.styleScope`
    const sheets = adoptedStyleSheets?.map((item) => item[SheetToken].getStyle(this)) || [];
    if (shadowRoot) {
      shadowRoot.adoptedStyleSheets = sheets;
    } else {
      return appleCSSStyleSheet(this, sheets);
    }
  };

  #disconnectStore?: (() => void)[];
  #connectedCallback = async () => {
    if (this.#isAppendReason) {
      this.#isAppendReason = false;
      return;
    }

    const { observedStores, rootElement } = this.#metadata;

    this.#isConnected = true;
    this.willMount?.();
    this.#disconnectStore = observedStores?.map((store) => connect(store, this.#update));
    this.#render();
    this.#isMounted = true;
    this.#clearStyle = this.#prepareStyle();
    // 等待所有元素的样式被应用，再执行回调
    // 这让 mounted 和 effect 回调和其他回调一样保持一样的异步行为
    await Promise.resolve();
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
    if (this.#metadata.noBlocking) {
      noBlockingTaskList.add(this.#connectedCallback);
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
    noBlockingTaskList.delete(this.#connectedCallback);
    noBlockingTaskList.delete(this.#updateCallback);
    this.#isMounted = false;
    this.#disconnectStore?.forEach((disconnect) => disconnect());
    // 是否要异步执行回调？
    execCallback(this.#unmountCallback);
    this.unmounted?.();
    this.#effectList = this.#clearEffect(this.#effectList);
    this.#memoList = this.#clearEffect(this.#memoList);
    execCallback(this.#clearStyle);
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
