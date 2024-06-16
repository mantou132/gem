import { defineCSSState, defineProperty, defineRef, GemElement } from './element';
import { Sheet, camelToKebabCase, randomStr } from './utils';
import { Store } from './store';

type GemElementPrototype = GemElement<any>;
type GemElementConstructor = typeof GemElement;
type StaticField = Exclude<keyof GemElementConstructor, 'prototype' | 'rootElement'>;
type StaticFieldMember = string | Store<unknown> | Sheet<unknown>;

function pushStaticField(target: GemElement | GemElementPrototype, field: StaticField, member: StaticFieldMember) {
  const cls = target.constructor as GemElementConstructor;
  if (!cls.hasOwnProperty(field)) {
    // 继承基类
    const current = new Set<unknown>(cls[field]);
    current.delete(member);
    Object.defineProperty(cls, field, {
      value: [...current],
    });
  }

  cls[field]!.push(member as any);
}

function clearField<T extends GemElement<any>>(instance: T, prop: string) {
  const desc = Reflect.getOwnPropertyDescriptor(instance, prop)!;
  Reflect.deleteProperty(instance, prop);
  Reflect.set(instance, prop, desc.value);
}

export type RefObject<T = HTMLElement> = { ref: string; element: T | undefined; elements: T[] };

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
    const target = Object.getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const ref = `${camelToKebabCase(prop)}-${randomStr()}`;
      pushStaticField(this, 'definedRefs', ref);
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
  const prop = observedTargetAttributes.get(Object.getPrototypeOf(this))?.get(n);
  if (!prop) return setAttribute.call(this, n, v);
  (this as any)[prop] = v;
};
GemElement.prototype.removeAttribute = function (n: string) {
  const prop = observedTargetAttributes.get(Object.getPrototypeOf(this))?.get(n);
  if (!prop) return removeAttribute.call(this, n);
  (this as any)[prop] = null;
};
GemElement.prototype.toggleAttribute = function (n: string, force?: boolean) {
  const prop = observedTargetAttributes.get(Object.getPrototypeOf(this))?.get(n);
  if (!prop) return toggleAttribute.call(this, n, force);
  return ((this as any)[prop] = force ?? !this.hasAttribute(n));
};

type AttrType = BooleanConstructor | NumberConstructor | StringConstructor;
function decoratorAttr<T extends GemElement<any>>(context: ClassFieldDecoratorContext<T>, attrType: AttrType) {
  const prop = context.name as string;
  const attr = camelToKebabCase(prop);
  context.addInitializer(function (this: T) {
    const target = Object.getPrototypeOf(this);
    if (!target.hasOwnProperty(prop)) {
      pushStaticField(target, 'observedAttributes', attr); // 没有 observe 的效果
      defineProperty(target, prop, { attr, attrType });
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
    const target = Object.getPrototypeOf(this);
    if (!target.hasOwnProperty(prop)) {
      pushStaticField(this, 'observedProperties', prop);
      defineProperty(target, prop);
    }
    clearField(this, prop);
  });
  // 延时定义的元素需要继承原实例属性值
  return function (this: any, initValue: any) {
    return this[prop] ?? initValue;
  };
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
    const target = Object.getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const attr = camelToKebabCase(prop);
      pushStaticField(this, 'definedCSSStates', attr);
      defineCSSState(target, prop, attr);
    }
    clearField(this, prop);
  });
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
    const target = context.static ? this.prototype : Object.getPrototypeOf(this);
    const prop = context.name as string;
    const attr = camelToKebabCase(prop);
    if (!target.hasOwnProperty(prop)) {
      defineProperty(target, prop);
      pushStaticField(target, 'definedSlots', attr);
    }
    return value || attr;
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
    const target = context.static ? this.prototype : Object.getPrototypeOf(this);
    const prop = context.name as string;
    const attr = camelToKebabCase(prop);
    if (!target.hasOwnProperty(prop)) {
      defineProperty(target, prop);
      pushStaticField(target, 'definedParts', attr);
    }
    return value || attr;
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
    defineEmitter(this, context.name as string);
  });
}
export function globalemitter<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, Emitter>,
) {
  context.addInitializer(function (this: T) {
    defineEmitter(this, context.name as string, { bubbles: true, composed: true });
  });
}
function defineEmitter(t: GemElement, prop: string, eventOptions?: Omit<CustomEventInit<unknown>, 'detail'>) {
  const target = Object.getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    const event = camelToKebabCase(prop);
    pushStaticField(target, 'definedEvents', event);
    defineProperty(target, prop, { event, eventOptions });
  }
  clearField(t, prop);
}

/**
 * 分配一个构造的样式表，如果元素是 lightDOM，则将样式表挂载到 RootNode 上
 *
 * For example
 * ```ts
 *  @adoptedStyle(stylesheet)
 *  class App extends GemElement {}
 * ```
 */
export function adoptedStyle(style: Sheet<unknown>) {
  return function (cls: unknown, _: ClassDecoratorContext) {
    const con = cls as GemElementConstructor;
    pushStaticField(con.prototype, 'adoptedStyleSheets', style);
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
  return function (cls: unknown, _: ClassDecoratorContext) {
    const con = cls as GemElementConstructor;
    pushStaticField(con.prototype, 'observedStores', store);
  };
}

/**
 * 限制元素的 root 节点类型
 *
 * For example
 * ```ts
 *  @rootElement('my-element')
 *  class App extends GemElement {}
 * ```
 */
export function rootElement(rootType: string) {
  return function (cls: unknown, _: ClassDecoratorContext) {
    const con = cls as GemElementConstructor;
    con.rootElement = rootType;
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
  return function (cls: new (...args: any) => any, _: ClassDecoratorContext) {
    customElements.define(name, cls);
  };
}
