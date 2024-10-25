import { html, render } from './lit-html';
import type { TemplateResult } from './lit-html';
import type { Store } from './store';
import { connect } from './store';
import { LinkedList, addMicrotask, isArrayChange, addListener, randomStr, createUpdater, GemError, raw } from './utils';

export { directive } from './directive';
export { repeat } from './repeat';
export { html, svg, mathml, render, TemplateResult, createRef } from './lit-html';

declare global {
  interface DOMStringMap {
    gemReflect?: '';
    gemStyle?: '';
    [name: string]: string | undefined;
  }
  // https://github.com/tc39/proposal-decorator-metadata
  interface SymbolConstructor {
    readonly metadata: symbol;
  }
}

const { assign, defineProperty } = Object;

defineProperty(Symbol, 'metadata', { value: Symbol.for('Symbol.metadata') });

const execCallback = (fun: any) => typeof fun === 'function' && fun();

// 读取构造样式表，跨多个 gem 工作
export const SheetToken = Symbol.for('gem@sheetToken');
// 更新元素，跨多个 gem 工作
export const UpdateToken = Symbol.for('gem@update');

const BoundaryCSSState = 'gem-style-boundary';
export const _RenderErrorEvent = 'gem@render-error';

// fix modal-factory type error
const updateTokenAlias = UpdateToken;

const rootStyleSheetInfo = new WeakMap<Document | ShadowRoot, Map<CSSStyleSheet, number>>();
const rootUpdateFnMap = new WeakMap<Map<CSSStyleSheet, number>, () => void>();

class GemCSSStyleSheet extends CSSStyleSheet {
  #ele?: HTMLStyleElement;

  cssText = '';
  get element() {
    if (!this.#ele) {
      this.#ele = document.createElement('style');
      this.#ele.textContent = this.cssText;
      this.#ele.dataset.gemStyle = '';
    }
    return this.#ele;
  }
  replaceSync(text: string) {
    this.cssText = text;
    if (this.#ele) this.#ele.textContent = text;
    super.replaceSync(text);
  }
}

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
  #record = new Map<any, GemCSSStyleSheet>();
  #used = new Map<GemCSSStyleSheet, string>();
  getStyle(host?: HTMLElement) {
    const isLight = host && !(host as GemElement).internals?.shadowRoot;

    // 对同一类 dom 只使用同一个样式表
    const key = isLight ? host.constructor : this;
    if (!this.#record.has(key)) {
      const sheet = new GemCSSStyleSheet({ media: this.#media });
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

  // 一般用于主题更新
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
export function createCSSSheet<T extends Record<string, string>>(media: TemplateStringsArray, ...rest: any[]): Sheet<T>;
export function createCSSSheet<T extends Record<string, string>>(media: string, rules: T | string): Sheet<T>;
export function createCSSSheet<T extends Record<string, string>>(rules: T | string): Sheet<T>;
export function createCSSSheet<T extends Record<string, string>>(
  mediaOrRules: T | string | TemplateStringsArray,
  ...rest: any[]
): Sheet<T> {
  let media = '';
  let rules: T | string = '';

  const rulesValue = rest.at(0);
  if (Array.isArray(mediaOrRules)) {
    rules = raw(mediaOrRules as TemplateStringsArray, ...rest);
  } else if (rulesValue !== undefined) {
    media = mediaOrRules as string;
    rules = rulesValue;
  } else {
    rules = mediaOrRules as string;
  }

  const styleSheet = new GemCSSSheet(media);
  const sheet: any = { [SheetToken]: styleSheet };
  let style = '';
  if (typeof rules === 'string') {
    style = rules;
  } else {
    Object.keys(rules).forEach((key) => {
      const isScope = key === '$';
      // 对于已经有 `-` 的保留原始 key，支持覆盖修改
      // :scope 下可以写嵌套样式 &:xxx，:host() 下不行（子内容可以）
      sheet[key] = isScope || key.includes('-') ? key : `${key}-${randomStr()}`;
      style += `${isScope ? ':where(:scope:not([hidden])),:host(:where(:not([hidden])))' : `.${sheet[key]}`} {${rules[key]}}`;
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
export let createState: <T>(initState: T) => ReturnType<typeof createUpdater<T>>;

type GetDepFun<T> = () => T;
type EffectCallback<T> = (depValues: T, oldDepValues?: T) => any;
type EffectItem<T> = {
  callback: EffectCallback<T>;
  initialized?: boolean;
  fixed?: boolean; // 不需要清理，只会添加一次
  values?: T;
  getDep?: GetDepFun<T>;
  preCallback?: any;
};

function execEffectList(list?: EffectItem<any>[]) {
  list?.forEach((effectItem) => {
    const { callback, getDep, values, preCallback } = effectItem;
    const newValues = getDep?.();
    if (!getDep || !values || isArrayChange(values, newValues)) {
      execCallback(preCallback);
      effectItem.preCallback = callback(newValues, values);
      effectItem.values = newValues;
      // 更新时也要设置，避免异步的 `#initEffect` 重复执行
      effectItem.initialized = true;
    }
  });
}

function clearEffect(list: EffectItem<any>[]) {
  return list.filter((e) => {
    execCallback(e.preCallback);
    e.initialized = false;
    e.values = undefined;
    return e.fixed;
  });
}

type Render = () => TemplateResult | null | undefined;
type RenderItem = { render: Render; condition?: () => boolean };

const nullTemplate = html`
  <style>
    :host {
      display: none !important;
    }
    @scope {
      :scope {
        display: none !important;
      }
    }
  </style>
`;

export let _createTemplate: (ele: GemElement, item: RenderItem) => void;

export type Metadata = Partial<ShadowRootInit> & {
  /** 内容可被外部样式化 */
  penetrable?: boolean;
  noBlocking?: boolean;
  aria?: Partial<
    ARIAMixin & {
      /** 自动添加 tabIndex；支持 `disabled` 属性 */
      focusable: boolean;
    }
  >;
  // 实例化时使用到，DevTools 需要读取
  observedStores: Store<any>[];
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
  #internals: ElementInternals & {
    // 有别于 adoptedStyleSheets，用来定义单个实例样式
    sheets: GemCSSStyleSheet[];
    stateList: ReturnType<typeof createState>[];
  };
  #effectList: EffectItem<any>[] = [];
  #memoList: EffectItem<any>[] = [];
  #renderList: RenderItem[] = [];
  #isAppendReason?: boolean;
  #isMounted?: boolean;
  // not in constructor 的近似值
  #notInCons?: boolean;
  #rendering?: boolean;
  #clearStyle?: (() => void) | undefined;

  [updateTokenAlias]() {
    // 避免 `connectedCallback` 中的 property 赋值造成多余更新
    if (this.#isMounted) addMicrotask(this.#update);
  }

  static {
    createState = <T>(initState: T) => {
      const ele = currentConstructGemElement;
      const state = createUpdater(initState, (payload) => {
        const effect = ele.#effectList.at(0);
        // https://github.com/mantou132/gem/issues/203
        if (ele.#isMounted && effect && !effect.initialized) {
          throw new GemError(`Do't set state sync before insert the DOM`);
        }
        assign(state, payload);
        // 避免无限刷新
        // 挂载前 set state 不应该触发更新
        if (!ele.#rendering && ele.#isMounted) addMicrotask(ele.#update);
      });
      ele.#internals.stateList.push(state);
      return state;
    };
    _createTemplate = (ele, item) => ele.#renderList.push(item);
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
    this.#internals.sheets = [];

    assign(this.#internals, internalsAria);

    // https://stackoverflow.com/questions/43836886/failed-to-construct-customelement-error-when-javascript-file-is-placed-in-head
    // focusable 元素一般同时具备 disabled 属性
    // 和原生元素行为保持一致，disabled 时不触发 click 事件
    let hasInitTabIndex: boolean | undefined;
    this.#effectList.push({
      fixed: true,
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

  get #renderItem() {
    // 从末尾开始寻找，允许被覆盖
    return this.#renderList.findLast((e) => !e.condition || e.condition());
  }

  get internals() {
    return this.#internals;
  }

  /**
   * 每次更新完检查依赖，执行对应的副作用回调
   * */
  #execEffect = () => {
    execEffectList(this.#effectList);
  };

  #execMemo = () => {
    execEffectList(this.#memoList);
  };

  /**
   * - 条件渲染
   * - 没有 `render` 时显示子内容
   * - 返回 `undefined` 时不会更新现有内容
   * - 返回 `null` 时渲染空内容
   * - 返回 html`` 时渲染空的子内容
   * */
  #render = (item?: RenderItem) => {
    try {
      this.#rendering = true;
      this.#execMemo();
      const isLight = this.#renderRoot === this;
      const temp = item ? item.render() : isLight ? undefined : html`<slot></slot>`;
      this.#rendering = false;
      if (temp === undefined) return;
      render(temp === null ? nullTemplate : temp, this.#renderRoot);
    } catch (err) {
      this.dispatchEvent(new CustomEvent(_RenderErrorEvent, { bubbles: true, composed: true, detail: err }));
      throw err;
    }
  };

  #updateCallback = () => {
    const item = this.#renderItem;
    if (
      this.#isMounted &&
      // 当有渲染函数，但是没一个符合条件时跳过
      (item || !this.#renderList.length)
    ) {
      this.#render(item);
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

  #prepareStyle = () => {
    const { adoptedStyleSheets = [] } = this.#metadata;
    const { shadowRoot, sheets } = this.#internals;

    const clsSheets = adoptedStyleSheets.map((item) => item[SheetToken].getStyle(this));
    if (shadowRoot) {
      shadowRoot.adoptedStyleSheets = clsSheets.concat(sheets);
    } else {
      this.prepend(...sheets.map((e) => e.element));
      return appleCSSStyleSheet(this, clsSheets);
    }
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

  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ willMount?(): void | Promise<void>;
  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ mounted?(): void | (() => void) | Promise<void>;
  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ updated?(): void | Promise<void>;
  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ unmounted?(): void | Promise<void>;
  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ shouldUpdate?(): boolean;
  /** @lifecycle 将来会彻底移除，现在做兼容实现*/ render?(): TemplateResult | null | undefined;
  #compat = () => {
    if (this.willMount) this.memo(this.willMount.bind(this), () => []);
    if (this.mounted) this.effect(this.mounted.bind(this), () => []);
    if (this.updated) this.effect((_, old) => old && this.updated!.apply(this));
    if (this.unmounted)
      this.effect(
        () => this.unmounted!.bind(this),
        () => [],
      );
    if (!this.#renderList.length && this.render)
      this.#renderList.push({ render: this.render.bind(this), condition: this.shouldUpdate?.bind(this) });
  };

  #disconnectStore?: (() => void)[];
  #connectedCallback = async () => {
    if (this.#isAppendReason) {
      this.#isAppendReason = false;
      // https://github.com/mantou132/gem/issues/202
      this.#clearStyle?.();
      this.#clearStyle = this.#prepareStyle();
      return;
    }
    this.#notInCons = true;
    this.#compat();

    const { observedStores, mode, penetrable } = this.#metadata;

    // 有渲染函数的 light dom 应该添加边界，防止内容被外部样式化
    // 如果渲染内容需要应用外部样式，需要手动 `delete` 边界
    if (!mode && this.#renderList.length && !penetrable) this.#internals.states.add(BoundaryCSSState);

    this.#disconnectStore = observedStores?.map((store) => connect(store, this.#update));
    this.#render(this.#renderItem);
    this.#isMounted = true;
    this.#clearStyle = this.#prepareStyle();
    // 等待所有元素的样式被应用，再执行回调
    // 这让 mounted 和 effect 回调和其他回调一样保持一样的异步行为
    await Promise.resolve();
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
    this.#effectList = clearEffect(this.#effectList);
    this.#memoList = clearEffect(this.#memoList);
    this.#clearStyle?.();
    return GemElement.#final;
  }

  /**
   * @helper
   * 记录副作用回调和值；
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
      fixed: !this.#notInCons,
    };
    // 已挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.#isMounted) {
      effectItem.values = getDep?.() as K;
      effectItem.preCallback = callback(effectItem.values);
    }
    this.#effectList.push(effectItem);
  };

  /**
   * @helper
   * 在 `render` 前执行回调；
   * 和 `effect` 一样接受依赖数组参数，在 `constructor` 中使用;
   * 第一次执行时 `oldDeps` 为空；
   *
   * ```js
   * class App extends GemElement {
   *   constructor() {
   *     super();
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
      fixed: !this.#notInCons,
    });
  };

  /**
   * @helper
   * async
   */
  update = () => addMicrotask(this.#update);
}
