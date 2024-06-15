import { defineAttribute, defineCSSState, defineProperty, defineRef, GemElement } from './element';
import { Sheet, camelToKebabCase, randomStr } from './utils';
import { Store } from './store';

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
  if (!cls.hasOwnProperty(field)) {
    // 继承基类
    const current = new Set<unknown>(cls[field]);
    current.delete(member);
    Object.defineProperty(cls, field, {
      value: isSet ? current : [...current],
    });
  }

  (cls[field] as any)[isSet ? 'add' : 'push'](member);
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
      pushStaticField(this, 'defineRefs', ref);
      defineRef(target, prop, ref);
    }
    clearField(this, prop);
  });
}

const observedTargetAttributes = new WeakMap<GemElementPrototype, Set<string>>();
const hackMethods = ['setAttribute', 'removeAttribute', 'toggleAttribute'] as const;
function hackObservedAttribute(target: any, attr: string) {
  const attrSet = observedTargetAttributes.get(target) || new Set(target.constructor.observedAttributes);
  attrSet.add(attr);
  if (!observedTargetAttributes.has(target)) {
    const proto = Element.prototype;
    hackMethods.forEach((key) => {
      target[key] = function (n: string, v?: string | boolean) {
        const oldV = proto.getAttribute.call(this, n);
        proto[key].call(this, n, v);
        if (attrSet.has(n) && oldV !== proto.getAttribute.call(this, n)) {
          this.attributeChangedCallback();
        }
      };
    });
  }
  observedTargetAttributes.set(target, attrSet);
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
function defineAttr(t: GemElement, prop: string, attrType?: StaticField) {
  const target = Object.getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    const attr = camelToKebabCase(prop);
    pushStaticField(target, 'observedAttributes', attr); // 没有 observe 的效果
    attrType && pushStaticField(target, attrType, attr, true);
    defineAttribute(target, prop, attr);
    // 不在 Devtools 中工作 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
    hackObservedAttribute(target, attr);
  }
  clearField(t, prop);
}
export function attribute<T extends GemElement<any>, V extends string>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, V>,
) {
  context.addInitializer(function (this: T) {
    const prop = context.name as string;
    defineAttr(this, prop);
  });
}
export function boolattribute<T extends GemElement<any>>(
  _: undefined,
  context: ClassFieldDecoratorContext<T, boolean>,
) {
  context.addInitializer(function (this: T) {
    const prop = context.name as string;
    defineAttr(this, prop, 'booleanAttributes');
  });
}
export function numattribute<T extends GemElement<any>>(_: undefined, context: ClassFieldDecoratorContext<T, number>) {
  context.addInitializer(function (this: T) {
    const prop = context.name as string;
    defineAttr(this, prop, 'numberAttributes');
  });
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
      pushStaticField(this, 'defineCSSStates', attr);
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
function defineEmitter(t: GemElement, prop: string, options?: Omit<CustomEventInit<unknown>, 'detail'>) {
  const target = Object.getPrototypeOf(t);
  if (!target.hasOwnProperty(prop)) {
    const event = camelToKebabCase(prop);
    pushStaticField(target, 'defineEvents', event);
    defineProperty(target, prop, event, options);
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
