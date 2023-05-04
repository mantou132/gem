/**
 * 不能使用 tsc 的 `useDefineForClassFields`,
 * 该参数将在实例上创建字段，导致 proto 上的 getter/setter 失效
 *
 * 字段装饰器运行在 `constructor` 前
 */

import { defineAttribute, defineCSSState, defineProperty, defineRef, GemElement, nativeDefineElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase, randomStr } from './utils';

type GemElementPrototype = GemElement<any>;
type GemElementConstructor = typeof GemElement;
type StaticField = Exclude<keyof GemElementConstructor, 'prototype' | 'rootElement'>;
type StaticFieldMember = string | Store<unknown> | Sheet<unknown>;

function pushStaticField(
  target: GemElement | GemElementPrototype,
  field: StaticField,
  member: StaticFieldMember,
  isSet = false,
) {
  const cls = target.constructor as GemElementConstructor;
  const current = cls[field];
  if (!cls.hasOwnProperty(field)) {
    Object.defineProperty(cls, field, {
      value: isSet ? new Set<unknown>(current) : current ? Array.from<any>(current) : [],
    });
  }

  (cls[field] as any)[isSet ? 'add' : 'push'](member);
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
  return function (this: T, value: RefObject<V>) {
    const target = Object.getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const ref = `${camelToKebabCase(prop)}-${randomStr()}`;
      pushStaticField(this, 'defineRefs', ref);
      defineRef(Object.getPrototypeOf(this), prop, ref);
    }
    return value;
  };
}

/**
 * 定义一个响应式的 attribute，驼峰字段名将自动映射到烤串 attribute，默认值为空字符串
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @attribute attr: string;
 *  }
 * ```
 */
const observedAttributes = new WeakMap<GemElementPrototype, Set<string>>();
function defineAttr(t: GemElement, prop: string, attr: string) {
  const target = Object.getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    pushStaticField(target, 'observedAttributes', attr); // 没有 observe 的效果
    defineAttribute(target, prop, attr);
  }

  // hack `observedAttributes`
  // 不在 Devtools 中工作 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
  const attrSet = observedAttributes.get(target) || new Set(target.constructor.observedAttributes);
  attrSet.add(attr);
  if (!observedAttributes.has(target)) {
    const setAttribute = Element.prototype.setAttribute;
    target.setAttribute = function (n: string, v: string) {
      setAttribute.apply(this, [n, v]);
      if (attrSet.has(n)) this.attributeChangedCallback();
    };
  }
  observedAttributes.set(target, attrSet);
}
export function attribute<T extends GemElement<any>, V extends string>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, V>,
) {
  return function (this: T, value: V) {
    const prop = context.name as string;
    defineAttr(this, prop, camelToKebabCase(prop));
    return value;
  };
}
export function boolattribute<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, boolean>,
) {
  return function (this: T, value: boolean) {
    const prop = context.name as string;
    const attr = camelToKebabCase(prop);
    pushStaticField(this, 'booleanAttributes', attr, true);
    defineAttr(this, prop, attr);
    return value;
  };
}
export function numattribute<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, number>) {
  return function (this: T, value: number) {
    const prop = context.name as string;
    const attr = camelToKebabCase(prop);
    pushStaticField(this, 'numberAttributes', attr, true);
    defineAttr(this, prop, attr);
    return value;
  };
}

/**
 * 定义一个响应式的 property，注意值可能为 `undefined`
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @property prop: Data | undefined;
 *  }
 * ```
 */
export function property<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T>) {
  return function (this: T, value: any) {
    const prop = context.name as string;
    const target = Object.getPrototypeOf(this);
    if (!target.hasOwnProperty(prop)) {
      pushStaticField(this, 'observedProperties', prop);
      defineProperty(target, prop);
    }
    return value;
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
  return function (this: T, _value: boolean) {
    const target = Object.getPrototypeOf(this);
    const prop = context.name as string;
    if (!target.hasOwnProperty(prop)) {
      const attr = camelToKebabCase(prop);
      pushStaticField(this, 'defineCSSStates', attr);
      defineCSSState(Object.getPrototypeOf(this), prop, attr);
    }
    return this[prop as keyof T] as boolean;
  };
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
      pushStaticField(target, 'defineSlots', attr);
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
      pushStaticField(target, 'defineParts', attr);
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
  return function (this: T, value: Emitter) {
    defineEmitter(this, context.name as string);
    return value;
  };
}
export function globalemitter<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, Emitter>,
) {
  return function (this: T, value: Emitter) {
    defineEmitter(this, context.name as string, { bubbles: true, composed: true });
    return value;
  };
}
function defineEmitter(t: GemElement, prop: string, options?: Omit<CustomEventInit<unknown>, 'detail'>) {
  const target = Object.getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    const event = camelToKebabCase(prop);
    pushStaticField(target, 'defineEvents', event);
    defineProperty(target, prop, event, options);
  }
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
    nativeDefineElement(name, cls);
  };
}
