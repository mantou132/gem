import { html, render, TemplateResult } from 'lit-html';

import type { GemReflectElement } from '../elements/reflect';

import { connect, Store } from './store';
import { LinkedList, addMicrotask, isArrayChange, addListener, randomStr } from './utils';

export { html, svg, render, directive, TemplateResult, SVGTemplateResult } from 'lit-html';

declare global {
  // 用于 css 选择器选择元素，使用 RefObject 自动选择获取
  // 必须使用 attr 赋值
  /**
   * @attr ref
   */
  interface HTMLElement {
    ref: string;
  }
  interface DOMStringMap {
    gemReflect?: '';
    [name: string]: string | undefined;
  }
  // https://github.com/tc39/proposal-decorator-metadata
  interface SymbolConstructor {
    readonly metadata: symbol;
  }
}

const { assign, defineProperty, setPrototypeOf } = Object;

defineProperty(Symbol, 'metadata', { value: Symbol.for('Symbol.metadata') });

const execCallback = (fun: any) => typeof fun === 'function' && fun();

// 跨多个 gem 工作
export const SheetToken = Symbol.for('gem@sheetToken');
// proto prop
export const UpdateToken = Symbol.for('gem@update');

export const BoundaryCSSState = 'gem-style-boundary';
// fix modal-factory type error
const updateTokenAlias = UpdateToken;

const rootStyleSheetInfo = new WeakMap<Document | ShadowRoot, Map<CSSStyleSheet, number>>();
const rootUpdateFnMap = new WeakMap<Map<CSSStyleSheet, number>, () => void>();

const getReflectTargets = (ele: ShadowRoot | GemElement) =>
  [...ele.querySelectorAll<GemReflectElement>('[data-gem-reflect]')].map((e) => e.target);

class RefObject<T = HTMLElement> {
  refSelector: string;
  ele: GemElement | ShadowRoot;
  ref: string;

  constructor(current: GemElement) {
    const ref = `ref-${randomStr()}`;
    this.refSelector = `[ref=${ref}]`;
    this.ele = current.internals.shadowRoot || current;
    this.ref = ref;
  }
  get element() {
    for (const e of [this.ele, ...getReflectTargets(this.ele)]) {
      // 在 LightDOM 中可能工作很慢？
      const result = e.querySelector(this.refSelector);
      if (result) return result as T;
    }
  }
  get elements() {
    return [this.ele, ...getReflectTargets(this.ele)]
      .map((e) => [...e.querySelectorAll(this.refSelector)] as T[])
      .flat();
  }
  toString() {
    return this.ref;
  }
}

/**必须使用在字段中，否则会读取到错误的实例 */
export let createRef: <T>() => RefObject<T>;

class GemCSSSheet {
  #content = '';
  #media = '';
  constructor(media = '') {
    this.#media = media;
  }
  setContent(v: string) {
    this.#content = v;
  }

  // 不需要 GC
  #record = new Map<any, CSSStyleSheet>();
  #used = new Map<CSSStyleSheet, string>();
  getStyle(host?: HTMLElement) {
    const metadata = host && (((host as any).constructor[Symbol.metadata] || {}) as Metadata);
    const isLight = metadata && !metadata.mode;

    // 对同一类 dom 只使用同一个样式表
    const key = isLight ? host.constructor : this;
    if (!this.#record.has(key)) {
      const sheet = new CSSStyleSheet({ media: this.#media });
      this.#record.set(key, sheet);
    }

    const sheet = this.#record.get(key)!;

    // 只执行一次
    if (!this.#used.has(sheet)) {
      let style = this.#content;
      let scope = '';
      if (isLight) {
        // light dom 嵌套时需要选择子元素
        // `> *` 实际上是多范围？是否存在性能问题
        scope = `@scope (${host.tagName}) to (:state(${BoundaryCSSState}) > *)`;
        // 不能使用 @layer，两个 @layer 不能覆盖，只有顺序起作用
        // 所以外部不能通过元素名称选择器来覆盖样式，除非样式在之前插入（会自动反转应用到尾部， see `appleCSSStyleSheet`）
        style = `${scope}{ ${style} }`;
      }
      sheet.replaceSync(style);
      this.#used.set(sheet, scope);
    }

    return sheet;
  }

  // 一般用于主题更新，不支持 layer
  updateStyle() {
    this.#used.forEach((scope, sheet) => {
      sheet.replaceSync(scope ? `${scope}{${this.#content}}` : this.#content);
    });
  }
}

export type Sheet<T> = { [P in keyof T]: P } & { [SheetToken]: GemCSSSheet };

/**
 *
 * 创建 style sheet 用于 `@adoptedStyle`，不支持样式更新，只支持自定义 CSS 属性
 */
export function createCSSSheet<T extends Record<string, string>>(media: string, rules: T | string): Sheet<T>;
export function createCSSSheet<T extends Record<string, string>>(rules: T | string): Sheet<T>;
export function createCSSSheet<T extends Record<string, string>>(
  mediaOrRules: T | string,
  rulesValue?: T | string,
): Sheet<T> {
  const media = rulesValue ? (mediaOrRules as string) : '';
  const rules = rulesValue || mediaOrRules;
  const styleSheet = new GemCSSSheet(media);
  const sheet: any = { [SheetToken]: styleSheet };
  let style = '';
  if (typeof rules === 'string') {
    style = rules;
  } else {
    Object.keys(rules).forEach((key) => {
      const isScope = key === '$';
      // 对于已经有 `-` 的保留原始 key，支持覆盖修改
      sheet[key] = isScope || key.includes('-') ? key : `${key}-${randomStr()}`;
      style += `${isScope ? ':scope,:host' : `.${sheet[key]}`} {${rules[key]}}`;
    });
  }
  styleSheet.setContent(style);
  return sheet as Sheet<T>;
}

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

const appleCSSStyleSheet = (ele: HTMLElement, sheets: CSSStyleSheet[]) => {
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
};

/**必须使用在字段中，否则会读取到错误的实例 */
export let createState: <T>(initState: T) => T & ((state: Partial<T>) => void);

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

export type Metadata = Partial<ShadowRootInit> & {
  noBlocking?: boolean;
  aria?: Partial<
    ARIAMixin & {
      /**自动添加 tabIndex；支持 `disabled` 属性 */
      focusable: boolean;
    }
  >;
  // 实例化时使用到，DevTools 需要读取
  observedStores: Store<unknown>[];
  adoptedStyleSheets?: Sheet<unknown>[];
  // 以下静态字段仅供外部读取，没有实际作用
  observedProperties?: string[];
  observedAttributes?: string[];
  definedEvents?: string[];
  definedCSSStates?: string[];
  definedParts?: string[];
  definedSlots?: string[];
  /**@deprecated GemDevtools 在使用*/
  definedRefs?: string[];
};

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

let currentConstructGemElement: GemElement;

export abstract class GemElement extends HTMLElement {
  // 禁止覆盖自定义元素原生生命周期方法
  // https://github.com/microsoft/TypeScript/issues/21388#issuecomment-934345226
  static #final = Symbol();

  #renderRoot: HTMLElement | ShadowRoot;
  #internals: ElementInternals & { stateList: ReturnType<typeof createState>[] };
  #effectList: EffectItem<any>[] = [];
  #memoList: EffectItem<any>[] = [];
  #isAppendReason?: boolean;
  // 和 isConnected 有区别
  #isMounted?: boolean;
  #isConnected?: boolean;
  #rendering?: boolean;
  #unmountCallback?: any;
  #clearStyle?: any;

  [updateTokenAlias]() {
    // 避免 `connectedCallback` 中的 property 赋值造成多余更新
    if (this.#isMounted) {
      addMicrotask(this.#update);
    }
  }

  static {
    createState = <T>(initState: T) => {
      const ele = currentConstructGemElement;
      const state: any = (payload: Partial<T>) => {
        assign(state, payload);
        // 避免无限刷新
        if (!ele.#rendering) addMicrotask(ele.#update);
      };
      setPrototypeOf(state, null);
      delete state.name;
      delete state.length;
      ele.#internals.stateList.push(state);
      assign(state, initState);
      return state as T & ((this: GemElement, state: Partial<T>) => void);
    };
    createRef = () => new RefObject(currentConstructGemElement);
  }

  constructor() {
    super();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    currentConstructGemElement = this;

    const { mode, serializable, delegatesFocus, slotAssignment, aria } = this.#metadata;
    const { focusable, ...internalsAria } = aria || {};

    this.#renderRoot = !mode ? this : this.attachShadow({ mode, serializable, delegatesFocus, slotAssignment });
    this.#internals = this.attachInternals() as GemElement['internals'];
    this.#internals.stateList = [];

    assign(this.#internals, internalsAria);

    // light dom 有 render 则不应该被外部样式化
    // 特殊情况手动 `remove` 状态
    if (!mode && this.render) this.#internals.states.add(BoundaryCSSState);

    // https://stackoverflow.com/questions/43836886/failed-to-construct-customelement-error-when-javascript-file-is-placed-in-head
    // focusable 元素一般同时具备 disabled 属性
    // 和原生元素行为保持一致，disabled 时不触发 click 事件
    let hasInitTabIndex: boolean | undefined;
    this.#effectList.push({
      inConstructor: true,
      getDep: () => [(this as any).disabled],
      callback: ([disabled = false]) => {
        if (hasInitTabIndex === undefined) hasInitTabIndex = this.hasAttribute('tabindex');
        this.#internals.ariaDisabled = String(disabled);
        if (focusable && !hasInitTabIndex) this.tabIndex = -Number(disabled);
        if ((focusable || delegatesFocus) && disabled) {
          return addListener(this, 'click', (e: Event) => e.isTrusted && e.stopImmediatePropagation(), {
            capture: true,
          });
        }
      },
    });
  }

  get #metadata(): Metadata {
    return (this.constructor as any)[Symbol.metadata];
  }

  get internals() {
    return this.#internals;
  }

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
   * - 返回 `undefined` 时不会更新现有内容
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
    const { adoptedStyleSheets = [] } = this.#metadata;
    const { shadowRoot } = this.#internals;

    const sheets = adoptedStyleSheets.map((item) => item[SheetToken].getStyle(this));
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

    const { observedStores } = this.#metadata;

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

  #clearEffect = (list: EffectItem<any>[]) => {
    return list.filter((e) => {
      execCallback(e.preCallback);
      e.initialized = false;
      e.values = undefined;
      return e.inConstructor;
    });
  };
}
