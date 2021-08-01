import { defineAttribute, defineCSSState, defineProperty, defineRef, GemElement, nativeDefineElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase, randomStr } from './utils';

type GemElementPrototype = GemElement;
type GemElementConstructor = typeof GemElement;
type StaticField = Exclude<keyof GemElementConstructor, 'prototype' | 'rootElement'>;
type StaticFieldMember = string | Store<unknown> | Sheet<unknown>;

function pushStaticField(target: GemElementPrototype, field: StaticField, member: StaticFieldMember, isSet = false) {
  const cls = target.constructor as GemElementConstructor;
  const current = cls[field];
  if (!cls.hasOwnProperty(field)) {
    Object.defineProperty(cls, field, {
      value: isSet ? new Set<unknown>(current) : current ? Array.from<any>(current) : [],
    });
  }

  (cls[field] as any)[isSet ? 'add' : 'push'](member);
}

export type RefObject<T = HTMLElement> = { ref: string; element: T | undefined };

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
export function refobject(target: GemElementPrototype, prop: string) {
  const ref = `${camelToKebabCase(prop)}-${randomStr()}`;
  pushStaticField(target, 'defineRefs', ref);
  defineRef(target, prop, ref);
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
function defineAttr(target: GemElementPrototype, prop: string, attr: string) {
  pushStaticField(target, 'observedAttributes', attr);
  defineAttribute(target, prop, attr);
}
export function attribute(target: GemElementPrototype, prop: string) {
  defineAttr(target, prop, camelToKebabCase(prop));
}
export function boolattribute(target: GemElementPrototype, prop: string) {
  const attr = camelToKebabCase(prop);
  pushStaticField(target, 'booleanAttributes', attr, true);
  defineAttr(target, prop, attr);
}
export function numattribute(target: GemElementPrototype, prop: string) {
  const attr = camelToKebabCase(prop);
  pushStaticField(target, 'numberAttributes', attr, true);
  defineAttr(target, prop, attr);
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
export function property(target: GemElementPrototype, prop: string) {
  pushStaticField(target, 'observedPropertys', prop);
  defineProperty(target, prop);
}

/**
 * 定义一个元素[内部](https://html.spec.whatwg.org/multipage/custom-elements.html#elementinternals) state，
 * 类似 `:checked`，用于自定义 css 伪类（:--xxx），默认值即为字段名。
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
export function state(target: GemElementPrototype, prop: string) {
  const attr = camelToKebabCase(prop);
  pushStaticField(target, 'defineCSSStates', attr);
  defineCSSState(target, prop, `--${attr}`);
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
export function slot(target: any, prop: string) {
  const attr = camelToKebabCase((target as any)[prop] || prop);
  (target as any)[prop] = attr;
  pushStaticField(target instanceof GemElement ? target : target.prototype, 'defineSlots', attr);
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
export function part(target: any, prop: string) {
  const attr = camelToKebabCase((target as any)[prop] || prop);
  (target as any)[prop] = attr;
  pushStaticField(target instanceof GemElement ? target : target.prototype, 'defineParts', attr);
}

export type Emitter<T = any> = (detail: T, options?: Omit<CustomEventInit<unknown>, 'detail'>) => void;

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
export function emitter(target: GemElementPrototype, prop: string) {
  defineEmitter(target, prop);
}
export function globalemitter(target: GemElementPrototype, prop: string) {
  defineEmitter(target, prop, { bubbles: true, composed: true });
}
function defineEmitter(target: GemElementPrototype, prop: string, options?: Omit<CustomEventInit<unknown>, 'detail'>) {
  const event = camelToKebabCase(prop);
  pushStaticField(target, 'defineEvents', event);
  defineProperty(target, prop, event, options);
}

/**
 * 分配一个构造的样式表
 *
 * For example
 * ```ts
 *  @adoptedStyle(stylesheet)
 *  class App extends GemElement {}
 * ```
 */
export function adoptedStyle(style: Sheet<unknown>) {
  return function (cls: unknown) {
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
  // 这里的签名该怎么写？
  return function (cls: unknown) {
    const con = cls as GemElementConstructor;
    pushStaticField(con.prototype, 'observedStores', store);
  };
}

/**
 * 限制元素的 root 节点类型
 *
 * For example
 * ```ts
 *  @rootElement(MyElement)
 *  class App extends GemElement {}
 * ```
 */
export function rootElement(rootType: string) {
  return function (cls: unknown) {
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
  return function (cls: unknown) {
    nativeDefineElement(name, cls as CustomElementConstructor);
  };
}
