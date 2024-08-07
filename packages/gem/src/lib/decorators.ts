import type { GemReflectElement } from '../elements/reflect';

import { createCSSSheet, GemElement, UpdateToken, Metadata, TemplateResult } from './element';
import { camelToKebabCase, randomStr, PropProxyMap, GemError } from './utils';
import { Store } from './store';
import * as elementExports from './element';
import * as decoratorsExports from './decorators';
import * as storeExports from './store';
import * as versionExports from './version';

type GemElementPrototype = GemElement<any>;
type StaticField = Exclude<keyof Metadata, keyof ShadowRootInit | 'aria' | 'noBlocking'>;

const { deleteProperty, getOwnPropertyDescriptor, defineProperty } = Reflect;
const { getPrototypeOf, assign } = Object;
const gemElementProxyMap = new PropProxyMap<GemElement>();

function pushStaticField(context: ClassFieldDecoratorContext | ClassDecoratorContext, field: StaticField, member: any) {
  const metadata = context.metadata as Metadata;
  if (!getOwnPropertyDescriptor(metadata, field)) {
    // 继承基类
    const current = new Set<unknown>(metadata[field]);
    current.delete(member);
    defineProperty(metadata, field, {
      value: [...current],
    });
  }

  metadata[field]!.push(member);
}

function clearField<T extends GemElement<any>>(instance: T, prop: string) {
  const { value } = getOwnPropertyDescriptor(instance, prop)!;
  deleteProperty(instance, prop);
  (instance as any)[prop] = value;
}

const getReflectTargets = (ele: ShadowRoot | GemElement) =>
  [...ele.querySelectorAll<GemReflectElement>('[data-gem-reflect]')].map((e) => e.target);

export class RefObject<T = HTMLElement> {
  refSelector: string;
  ele: GemElement | ShadowRoot;
  ref: string;

  constructor(ele: GemElement | ShadowRoot, ref: string) {
    this.refSelector = `[ref=${ref}]`;
    this.ele = ele;
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

function defineRef(target: GemElement, prop: string, ref: string) {
  defineProperty(target, prop, {
    configurable: true,
    get() {
      const proxy = gemElementProxyMap.get(this);
      let obj = proxy[prop];
      if (!obj) {
        const that = this as GemElement;
        obj = new RefObject(that.shadowRoot || that, ref);
        proxy[prop] = obj;
      }
      return obj;
    },
    set() {
      //
    },
  });
}

/**
 * 引用元素，只有第一个标记 ref 的元素有效
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @refobject childRef: RefObject<Children>;
 *    loadHandle = () => {
 *      const { element } = this.childRef;
 *      console.log(element);
 *    };
 *    render() {
 *      render html`<div ref=${this.childRef.ref}><div>`;
 *    }
 *  }
 * ```
 */
export function refobject<T extends GemElement<any>, V extends HTMLElement>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, RefObject<V>>,
) {
  context.addInitializer(function (this: T) {
    const target = getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const ref = `${camelToKebabCase(prop)}-${randomStr()}`;
      pushStaticField(context, 'definedRefs', ref);
      defineRef(target, prop, ref);
    }
    clearField(this, prop);
  });
}

const observedTargetAttributes = new WeakMap<GemElementPrototype, Map<string, string>>();
// hack 修改 attribute 行为，如果是观察的，就使用 `setter`
// 不在 Devtools 中工作 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
// 使用 Gem DevTools 注入脚本监听 attribute 变化
const { setAttribute, toggleAttribute, removeAttribute } = Element.prototype;
GemElement.prototype.setAttribute = function (n: string, v: string) {
  const prop = observedTargetAttributes.get(getPrototypeOf(this))?.get(n);
  if (!prop) return setAttribute.call(this, n, v);
  (this as any)[prop] = v;
};
GemElement.prototype.removeAttribute = function (n: string) {
  const prop = observedTargetAttributes.get(getPrototypeOf(this))?.get(n);
  if (!prop) return removeAttribute.call(this, n);
  (this as any)[prop] = null;
};
GemElement.prototype.toggleAttribute = function (n: string, force?: boolean) {
  const prop = observedTargetAttributes.get(getPrototypeOf(this))?.get(n);
  if (!prop) return toggleAttribute.call(this, n, force);
  return ((this as any)[prop] = force ?? !this.hasAttribute(n));
};

function emptyFunction() {
  // 用于占位的空函数
}

type DefinePropOptions = {
  attr?: string;
  attrType?: (v?: any) => any;
  event?: string;
  eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>;
};
const isEventHandleSymbol = Symbol('event handle');
function defineProp(
  target: GemElementPrototype,
  prop: string,
  { attr, attrType, event, eventOptions }: DefinePropOptions = {},
) {
  defineProperty(target, prop, {
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
        (proxy[prop] as any)[isEventHandleSymbol] = true;
        // emitter 不触发元素更新
      } else {
        proxy[prop] = v;
        this[UpdateToken]();
      }
    },
  });
}

type AttrType = BooleanConstructor | NumberConstructor | StringConstructor;
function decoratorAttr<T extends GemElement<any>>(context: ClassFieldDecoratorContext<T>, attrType: AttrType) {
  const prop = context.name as string;
  const attr = camelToKebabCase(prop);
  context.addInitializer(function (this: T) {
    const target = getPrototypeOf(this);
    if (!target.hasOwnProperty(prop)) {
      pushStaticField(context, 'observedAttributes', attr); // 没有 observe 的效果
      defineProp(target, prop, { attr, attrType });
      // 记录观察的 attribute
      const attrMap = observedTargetAttributes.get(target) || new Map<string, string>();
      attrMap.set(attr, prop);
      observedTargetAttributes.set(target, attrMap);
    }
    clearField(this, prop);
  });
  // 延时定义的元素需要继承原实例属性值
  return function (this: any, initValue: any) {
    return this.getAttribute(attr) ?? initValue;
  };
}

/**
 * 定义一个响应式的 attribute，驼峰字段名将自动映射到烤串 attribute，默认值为空字符串；不要覆盖定义
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @attribute attr: string;
 *  }
 * ```
 */
export function attribute<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, string>) {
  return decoratorAttr(context, String);
}
export function boolattribute<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, boolean>,
) {
  return decoratorAttr(context, Boolean);
}
export function numattribute<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, number>) {
  return decoratorAttr(context, Number);
}

/**
 * 定义一个响应式的 property，注意值可能为 `undefined`；不要覆盖定义
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @property prop: Data | undefined;
 *  }
 * ```
 */
export function property<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T>) {
  const prop = context.name as string;
  context.addInitializer(function (this: T) {
    const target = getPrototypeOf(this);
    if (!target.hasOwnProperty(prop)) {
      pushStaticField(context, 'observedProperties', prop);
      defineProp(target, prop);
    }
    clearField(this, prop);
  });
  // 延时定义的元素需要继承原实例属性值
  return function (this: any, initValue: any) {
    return this[prop] ?? initValue;
  };
}

/**
 * 依赖 `GemElement.memo`
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @memo(() => [])
 *    get data() {
 *      return 1;
 *    }
 *  }
 * ```
 */
export function memo<T extends GemElement<any>, V = any, K = any[] | undefined>(
  getDep: K extends readonly any[] ? (instance: T) => K : undefined,
) {
  return function (
    _: any,
    context: ClassGetterDecoratorContext<T, V> | ClassFieldDecoratorContext<T> | ClassMethodDecoratorContext<T>,
  ) {
    const { addInitializer, name, access, kind } = context;
    addInitializer(function (this: T) {
      const dep = getDep && (() => getDep(this) as any);
      if (kind === 'getter') {
        // 不能设置私有字段 https://github.com/tc39/proposal-decorators/issues/509
        if (context.private) throw new GemError('not support');
        this.memo(() => defineProperty(this, name, { configurable: true, value: access.get(this) }), dep);
      } else {
        this.memo((access.get(this) as any).bind(this) as any, dep);
      }
    });
  };
}

/**
 * 依赖 `GemElement.effect`
 * 方法执行在字段前面
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @effect(() => [])
 *    #fetchData() {
 *      console.log('fetch')
 *    }
 *  }
 * ```
 */
export function effect<
  T extends GemElement<any>,
  V extends (depValues: K, oldDepValues?: K) => any,
  K = any[] | undefined,
>(getDep?: K extends readonly any[] ? (instance: T) => K : undefined) {
  return function (
    _: any,
    { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>,
  ) {
    addInitializer(function (this: T) {
      this.effect(access.get(this).bind(this) as any, getDep && (() => getDep(this) as any));
    });
  };
}

export function unmounted<T extends GemElement<any>, V extends () => any>() {
  return function (
    _: any,
    { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>,
  ) {
    addInitializer(function (this: T) {
      this.effect(
        () => access.get(this).bind(this) as any,
        () => [],
      );
    });
  };
}

/**`@memo` 别名 */
export function willMount() {
  return memo(() => []);
}

/**`@effect` 别名 */
export function mounted() {
  return effect(() => []);
}

export function renderTemplate<T extends GemElement<any>, V extends () => TemplateResult | null | undefined>(
  /**当返回 `false` 时不进行更新，包括 `memo` */
  shouldRender?: (instance: T) => boolean,
) {
  return function (
    _: any,
    { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>,
  ) {
    addInitializer(function (this: T) {
      if (shouldRender) this.shouldUpdate = () => shouldRender(this);
      this.render = access.get(this).bind(this);
    });
  };
}

function defineCSSState(target: GemElementPrototype, prop: string, stateStr: string) {
  defineProperty(target, prop, {
    configurable: true,
    get() {
      const that = this as GemElement;
      const { states } = that.internals;
      return states?.has(stateStr);
    },
    set(v: boolean) {
      const that = this as GemElement;
      const { states } = that.internals;
      if (v) {
        states?.add(stateStr);
      } else {
        states?.delete(stateStr);
      }
    },
  });
}

/**
 * 定义一个元素[内部](https://html.spec.whatwg.org/multipage/custom-elements.html#elementinternals) state，
 * 类似 `:checked`，用于自定义 css 伪类（:state(xxx)），默认值即为字段名。
 * 重新赋值转换 css 伪类
 * 将来也可能用于 IDE 识别
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @state state: boolean;
 *  }
 * ```
 */
export function state<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, boolean>) {
  context.addInitializer(function (this: T) {
    const target = getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const attr = camelToKebabCase(prop);
      pushStaticField(context, 'definedCSSStates', attr);
      defineCSSState(target, prop, attr);
    }
    clearField(this, prop);
  });
}

function defineStaticField(
  context: ClassFieldDecoratorContext<any, string>,
  target: any,
  field: StaticField,
  value: string,
) {
  const prop = context.name as string;
  const attr = camelToKebabCase(prop);
  if (context.static) {
    pushStaticField(context, field, attr);
  } else {
    const proto = getPrototypeOf(target);
    if (!proto[prop]) {
      proto[prop] = attr;
      pushStaticField(context, field, attr);
    }
  }
  return value || attr;
}

/**
 * 定义一个内部 slot，默认值即为字段名，不能使用全局属性 `slot`
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @slot slot: string;
 *    @slot static slot: string;
 *  }
 * ```
 */
export function slot(_: undefined, context: ClassFieldDecoratorContext<any, string>) {
  return function (this: any, value: string) {
    return defineStaticField(context, this, 'definedSlots', value);
  };
}

/**
 * 定义一个内部 part，默认值即为字段名，不能使用全局属性 `part`
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @part part: string;
 *    @part static part: string;
 *  }
 * ```
 */
export function part(_: undefined, context: ClassFieldDecoratorContext<any, string>) {
  return function (this: any, value: string) {
    return defineStaticField(context, this, 'definedParts', value);
  };
}

export type Emitter<T = any> = (detail?: T, options?: Omit<CustomEventInit<unknown>, 'detail'>) => void;

/**
 * 定义一个事件发射器，类似 `HTMLElement.click`，
 * 调用时将同步发送一个和字段名称的烤串式格式的自定义事件
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @emitter load: Function;
 *  }
 * ```
 */
export function emitter<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, Emitter>) {
  context.addInitializer(function (this: T) {
    defineEmitter(context, this, context.name as string);
  });
}
export function globalemitter<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, Emitter>,
) {
  context.addInitializer(function (this: T) {
    defineEmitter(context, this, context.name as string, { bubbles: true, composed: true });
  });
}
function defineEmitter(
  context: ClassFieldDecoratorContext,
  t: GemElement,
  prop: string,
  eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>,
) {
  const target = getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    const event = camelToKebabCase(prop);
    pushStaticField(context, 'definedEvents', event);
    defineProp(target, prop, { event, eventOptions });
  }
  clearField(t, prop);
}

/**
 * 分配一个构造的样式表，前面的优先级越高（因为装饰器是越近越早执行）
 *
 * For example
 * ```ts
 *  @adoptedStyle(stylesheet)
 *  class App extends GemElement {}
 * ```
 */
export function adoptedStyle(sheet: ReturnType<typeof createCSSSheet>) {
  return function (_: unknown, context: ClassDecoratorContext) {
    pushStaticField(context, 'adoptedStyleSheets', sheet);
  };
}

/**
 * 链接一个 store，当 store 更新时更新元素
 *
 * For example
 * ```ts
 *  @connectStore(store)
 *  class App extends GemElement {}
 * ```
 */
export function connectStore(store: Store<unknown>) {
  return function (_: unknown, context: ClassDecoratorContext) {
    pushStaticField(context, 'observedStores', store);
  };
}

export function shadow({
  mode = 'open',
  serializable = true,
  delegatesFocus,
  slotAssignment,
}: Partial<ShadowRootInit> = {}) {
  return function (_: any, context: ClassDecoratorContext) {
    const metadata = context.metadata as Metadata;
    assign(metadata, { mode, serializable, delegatesFocus, slotAssignment });
  };
}

/**
 * 将元素标记为可中断异步渲染
 * 例如：https://examples.gemjs.org/async
 */
export function async() {
  return function (_: any, context: ClassDecoratorContext) {
    const metadata = context.metadata as Metadata;
    metadata.noBlocking = true;
  };
}

/**
 * 定义元素的可访问性属性
 */
export function aria(info: Metadata['aria']) {
  return function (_: any, context: ClassDecoratorContext) {
    const metadata = context.metadata as Metadata;
    metadata.aria = { ...metadata.aria, ...info };
  };
}

/**
 * 定义自定义元素
 *
 * For example
 * ```ts
 *  @customElement('my-element')
 *  class App extends GemElement {}
 * ```
 */
export function customElement(name: string) {
  return function (cls: new (...args: any) => any, { addInitializer }: ClassDecoratorContext) {
    addInitializer(function () {
      customElements.define(name, cls);
    });
  };
}

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?:
      | (typeof elementExports & typeof decoratorsExports & typeof storeExports & typeof versionExports)
      | Record<string, never>;
  }
}

if (window.__GEM_DEVTOOLS__HOOK__) {
  assign(window.__GEM_DEVTOOLS__HOOK__, {
    ...elementExports,
    ...decoratorsExports,
    ...storeExports,
    ...versionExports,
  });
}
