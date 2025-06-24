import type { TemplateResult } from './lit-html';
import type { Metadata, Sheet } from './reactive';
import { _createTemplate, _RenderErrorEvent, GemElement, render, UpdateToken } from './reactive';
import type { Store } from './store';
import { camelToKebabCase, GemError, PropProxyMap } from './utils';

type GemElementPrototype = GemElement & { '': never };
type StaticField = Exclude<keyof Metadata, keyof ShadowRootInit | 'aria' | 'noBlocking' | 'penetrable'>;

const { deleteProperty, getOwnPropertyDescriptor, defineProperty } = Reflect;
const { getPrototypeOf, assign, hasOwn } = Object;
const gemElementProxyMap = new PropProxyMap<GemElement>();

function pushStaticField(context: ClassFieldDecoratorContext | ClassDecoratorContext, field: StaticField, member: any) {
  const metadata = context.metadata as Metadata;
  if (!getOwnPropertyDescriptor(metadata, field)) {
    // 继承基类
    defineProperty(metadata, field, {
      value: metadata[field]?.filter((e) => e !== member) || [],
    });
  }

  metadata[field]!.push(member);
}

function clearField<T extends GemElement>(instance: T, prop: string) {
  // hmr 支持不存在属性
  const { value } = getOwnPropertyDescriptor(instance, prop) || {};
  deleteProperty(instance, prop);
  (instance as any)[prop] = value;
}

const observedTargetAttributes = new WeakMap<GemElementPrototype, Map<string, string>>();
// hack 修改 attribute 行为，如果是观察的，就使用 `setter`
// 不在 Devtools 中工作 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
// 使用 Gem DevTools 注入脚本监听 attribute 变化
const { setAttribute, toggleAttribute, removeAttribute } = Element.prototype;
const getObservedPropName = (i: GemElement, n: string) => observedTargetAttributes.get(getPrototypeOf(i))?.get(n);
GemElement.prototype.setAttribute = function (n: string, v: string) {
  const prop = getObservedPropName(this, n);
  if (!prop) return setAttribute.call(this, n, v);
  (this as any)[prop] = v;
};
GemElement.prototype.removeAttribute = function (n: string) {
  const prop = getObservedPropName(this, n);
  if (!prop) return removeAttribute.call(this, n);
  (this as any)[prop] = null;
};
GemElement.prototype.toggleAttribute = function (n: string, force?: boolean) {
  const prop = getObservedPropName(this, n);
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
          : async (detail: any, options: any) => {
              // 事件如果同步触发，则祖先元素可能还没有挂载好，其中就不能更新 state
              // https://github.com/mantou132/gem/issues/203
              await Promise.resolve();
              const evt = new CustomEvent(event, { ...options, ...eventOptions, detail });
              that.dispatchEvent(evt);
              await v(detail, options);
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

// https://github.com/tc39/proposal-decorators/issues/517
const targetCache = new WeakMap<DecoratorMetadataObject, GemElementPrototype>();
function getDecoratorTarget(element: GemElement, { metadata }: ClassMemberDecoratorContext) {
  const target = targetCache.get(metadata);
  if (target) return target;
  let result = element as GemElementPrototype;
  do {
    result = getPrototypeOf(result);
  } while (result.constructor[Symbol.metadata] !== metadata);
  targetCache.set(metadata, result);
  return result;
}

type AttrType = BooleanConstructor | NumberConstructor | StringConstructor;
function decoratorAttr<T extends GemElement>(context: ClassFieldDecoratorContext<T>, attrType: AttrType) {
  const prop = context.name as string;
  const attr = camelToKebabCase(prop);
  context.addInitializer(function (this: T) {
    const target = getDecoratorTarget(this, context);
    if (!hasOwn(target, prop)) {
      pushStaticField(context, 'observedAttributes', attr); // 没有 observe 的效果
      defineProp(target, prop, { attr, attrType });
    }
    clearField(this, prop);
    // 记录观察的 attribute, 用于 hack 的 setAttribute
    const proto = getPrototypeOf(this);
    const attrMap = observedTargetAttributes.get(proto) || new Map<string, string>();
    attrMap.set(attr, prop);
    observedTargetAttributes.set(proto, attrMap);
  });
  // 延时定义的元素需要继承原实例属性值
  return function (this: any, initValue: any) {
    return this.getAttribute(attr) ?? initValue;
  };
}

/**
 * 定义一个响应式的 attribute，驼峰字段名将自动映射到烤串 attribute，默认值为空字符串；不要覆盖定义
 *
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​attribute attr: string;
 * }
 * ```
 */
export function attribute<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, string>) {
  return decoratorAttr(context, String);
}
export function boolattribute<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, boolean>) {
  return decoratorAttr(context, Boolean);
}
export function numattribute<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, number>) {
  return decoratorAttr(context, Number);
}

/**
 * 定义一个响应式的 property，注意值可能为 `undefined`；不要覆盖定义
 *
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​property prop: Data | undefined;
 * }
 * ```
 */
export function property<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T>) {
  const prop = context.name as string;
  context.addInitializer(function (this: T) {
    const target = getDecoratorTarget(this, context);
    if (!hasOwn(target, prop)) {
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
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​memo(() => [])
 *   get data() {
 *     return 1;
 *   }
 * }
 * ```
 */
export function memo<T extends GemElement, V = any, K = any[] | undefined>(
  getDep?: K extends readonly any[] ? (instance: T) => K : undefined,
) {
  return (
    _: any,
    context: ClassGetterDecoratorContext<T, V> | ClassFieldDecoratorContext<T> | ClassMethodDecoratorContext<T>,
  ) => {
    const { addInitializer, name, access, kind } = context;
    addInitializer(function (this: T) {
      const dep = getDep && (() => getDep(this) as any);
      if (kind === 'getter') {
        // 不能设置私有字段 https://github.com/tc39/proposal-decorators/issues/509
        if (context.private) throw new GemError('not support');
        const target = getDecoratorTarget(this, context as any);
        // 不能直接用 `access.get.bind(this)` 是现有 builder 工具的 bug？
        const getter = getOwnPropertyDescriptor(target, name)!.get!.bind(this);
        this.memo(() => {
          defineProperty(this, name, {
            configurable: true,
            value: getter(),
          });
        }, dep);
      } else {
        this.memo((access.get.call(this, this) as any).bind(this), dep);
      }
    });
  };
}

/**
 * - 依赖 `GemElement.effect`
 * - 方法执行在字段前面
 * - 如果没有 oldValue，在为首次执行
 *
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​effect(() => [])
 *   #fetchData(newValue, oldValue) {
 *     console.log('fetch')
 *   }
 * }
 * ```
 */
export function effect<T extends GemElement, V extends (depValues: K, oldDepValues?: K) => any, K = any[] | undefined>(
  getDep?: K extends readonly any[] ? (instance: T) => K : undefined,
) {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function (this: T) {
      this.effect(access.get.call(this, this).bind(this) as any, getDep && (() => getDep(this) as any));
    });
  };
}

export function unmounted<T extends GemElement, V extends () => any>() {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function (this: T) {
      this.effect(
        () => access.get.call(this, this).bind(this) as any,
        () => [],
      );
    });
  };
}

/**`@memo` 别名，不能再在回调中使用 `this.memo` */
export function willMount() {
  return memo(() => []);
}

/**`@effect` 别名，不能再在回调中使用 `this.effect` */
export function mounted() {
  return effect(() => []);
}

export function template<T extends GemElement, V extends () => TemplateResult | null | undefined>(
  /** 当所有 `template` 返回 `false` 时不进行更新，包括 `memo` */
  condition?: (instance: T) => boolean,
) {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function (this: T) {
      _createTemplate(this, {
        render: access.get.call(this, this).bind(this),
        condition: condition && (() => condition(this) as any),
      });
    });
  };
}

export function fallback<T extends GemElement, V extends (err: any) => TemplateResult | null | undefined>() {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function (this: T) {
      this.addEventListener(_RenderErrorEvent, ({ detail }: CustomEvent) => {
        render(access.get.call(this, this).apply(this, [detail]), this.internals.shadowRoot || this);
      });
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
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​state state: boolean;
 * }
 * ```
 */
export function state<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, boolean>) {
  const prop = context.name as string;
  const attr = camelToKebabCase(prop);
  context.addInitializer(function (this: T) {
    const target = getDecoratorTarget(this, context);
    if (!hasOwn(target, prop)) {
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
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​slot slot: string;
 *   @​slot static slot: string;
 * }
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
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​part part: string;
 *   @​part static part: string;
 * }
 * ```
 */
export function part(_: undefined, context: ClassFieldDecoratorContext<any, string>) {
  return function (this: any, value: string) {
    return defineStaticField(context, this, 'definedParts', value);
  };
}

type EmitterHandler<T> = (evt: CustomEvent<T>) => void;

export type Emitter<T = any> = ((
  detail?: T,
  options?: Omit<CustomEventInit<unknown>, 'detail'>,
) => Promise<void> | void) & {
  /**
   * @internal 用来为 ts plugin 提供类型签名，没有值
   */
  handler?: EmitterHandler<T> | (AddEventListenerOptions & { handleEvent: EmitterHandler<T> });
};

/**
 * 定义一个事件发射器，类似 `HTMLElement.click`，
 * 调用时将同步发送一个和字段名称的烤串式格式的自定义事件
 *
 * @example
 * ```ts
 * class App extends GemElement {
 *   @​emitter load: Function;
 * }
 * ```
 */
export function emitter<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, Emitter>) {
  defineEmitter(context);
}
export function globalemitter<T extends GemElement>(_: undefined, context: ClassFieldDecoratorContext<T, Emitter>) {
  defineEmitter(context, { bubbles: true, composed: true });
}
function defineEmitter<T extends GemElement>(
  context: ClassFieldDecoratorContext,
  eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>,
) {
  const prop = context.name as string;
  const event = camelToKebabCase(prop);
  context.addInitializer(function (this: T) {
    const target = getDecoratorTarget(this, context);
    if (!hasOwn(target, prop)) {
      pushStaticField(context, 'definedEvents', event);
      defineProp(target, prop, { event, eventOptions });
    }
    clearField(this, prop);
  });
}

/**
 * 分配一个构造的样式表，前面的优先级越高（因为装饰器是越近越早执行）
 *
 * @example
 * ```ts
 * ​@​adoptedStyle(stylesheet)
 * class App extends GemElement {}
 * ```
 */
export function adoptedStyle(sheet: Sheet<unknown>) {
  return (_: unknown, context: ClassDecoratorContext) => {
    pushStaticField(context, 'adoptedStyleSheets', sheet);
  };
}

/**
 * 链接一个 store，当 store 更新时更新元素
 *
 * @example
 * ```ts
 * ​@​connectStore(store)
 * class App extends GemElement {}
 * ```
 */
export function connectStore(store: Store<any>) {
  return (_: unknown, context: ClassDecoratorContext) => {
    pushStaticField(context, 'observedStores', store);
  };
}

export function shadow({
  mode = 'open',
  serializable = true,
  delegatesFocus,
  slotAssignment,
}: Partial<ShadowRootInit> = {}) {
  return (_: any, context: ClassDecoratorContext) => {
    const metadata = context.metadata as Metadata;
    assign(metadata, { mode, serializable, delegatesFocus, slotAssignment });
  };
}

export function light({ penetrable }: Pick<Metadata, 'penetrable'>) {
  return (_: any, context: ClassDecoratorContext) => {
    const metadata = context.metadata as Metadata;
    metadata.penetrable = penetrable;
  };
}

/**
 * 将元素标记为可中断异步渲染
 * 例如：https://examples.gemjs.org/async
 */
export function async() {
  return (_: any, context: ClassDecoratorContext) => {
    const metadata = context.metadata as Metadata;
    metadata.noBlocking = true;
  };
}

/**
 * 定义元素的可访问性属性
 */
export function aria(info: Metadata['aria']) {
  return (_: any, context: ClassDecoratorContext) => {
    const metadata = context.metadata as Metadata;
    metadata.aria = { ...metadata.aria, ...info };
  };
}

/**
 * 定义自定义元素
 *
 * @example
 * ```ts
 * ​@​customElement('my-element')
 * class App extends GemElement {}
 * ```
 */
export function customElement(name: string) {
  return (cls: new (...args: any) => any, { addInitializer }: ClassDecoratorContext) => {
    addInitializer(() => {
      customElements.define(name, cls);
    });
  };
}
