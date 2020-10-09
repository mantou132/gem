/**
 * target 并非元素，而是类的原型对象
 * 不能在 target 上使用 DOM API
 * 类定义之后立即执行，自定义元素可以在实例化时覆盖原型对象上的属性
 */

import { BaseElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase } from './utils';

export type RefObject<T = BaseElement> = { ref: string; element: T | null };

/**
 * @example
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
export function refobject(target: BaseElement, prop: string) {
  const attr = camelToKebabCase(prop);
  Object.defineProperty(target, prop, {
    get() {
      const that = this as BaseElement;
      const ele = that.shadowRoot || that;
      return {
        ref: attr,
        get element() {
          return ele.querySelector(`[ref=${attr}]`);
        },
      };
    },
  });
}

/**
 * 定义一个响应式的 attribute，驼峰字段名将自动映射到烤串 attribute，默认值为空字符串
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @attribute attr: string;
 *  }
 * ```
 */
function defineAttr(target: BaseElement, attr: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedAttributes) con.observedAttributes = [];
  con.observedAttributes.push(attr);
}
export function boolattribute(target: BaseElement, prop: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.booleanAttributes) con.booleanAttributes = new Set();
  const attr = camelToKebabCase(prop);
  con.booleanAttributes.add(attr);
  defineAttr(target, attr);
}
export function numattribute(target: BaseElement, prop: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.numberAttributes) con.numberAttributes = new Set();
  const attr = camelToKebabCase(prop);
  con.numberAttributes.add(attr);
  defineAttr(target, attr);
}
export function attribute(target: BaseElement | typeof Boolean | typeof Number, prop: string) {
  defineAttr(target as BaseElement, camelToKebabCase(prop));
}

/**
 * 定义一个响应式的 property，注意值可能为 `undefined`
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @property prop: Data | undefined;
 *  }
 * ```
 */
export function property(target: BaseElement, prop: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedPropertys) con.observedPropertys = [];
  con.observedPropertys.push(prop);
}

/**
 * 定义一个元素[内部](https://html.spec.whatwg.org/multipage/custom-elements.html#elementinternals) state，
 * 类似 `:checked`，用于自定义 css 伪类（:state(xxx)），默认值即为字段名。
 * 重新赋值转换 css 伪类
 * 将来也可能用于 IDE 识别
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @state state: boolean;
 *  }
 * ```
 */
export function state(target: BaseElement, prop: string) {
  Object.defineProperty(target, prop, {
    get() {
      const that = this as BaseElement;
      return !!that.internals?.states?.contains(prop);
    },
    set(v: boolean) {
      const that = this as BaseElement;
      const internals = that.internals;
      if (v) {
        internals.states.add(prop);
      } else {
        internals.states.remove(prop);
      }
    },
  });
}

/**
 * 定义一个内部 slot，默认值即为字段名。
 * 将来也可能用于 IDE 识别
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @slot slot: string;
 *  }
 * ```
 */
export function slot(target: BaseElement, prop: string) {
  const proto = target as BaseElement & { [index: string]: string };
  proto[prop] = prop;
}

/**
 * 定义一个内部 part，默认值即为字段名。
 * 将来也可能用于 IDE 识别
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @part part: string;
 *  }
 * ```
 */
export function part(target: BaseElement, prop: string) {
  const proto = target as BaseElement & { [index: string]: string };
  proto[prop] = prop;
}

export type Emitter<T = any> = (detail: T, options?: Omit<CustomEventInit<unknown>, 'detail'>) => void;

/**
 * 定义一个事件发射器，类似 `HTMLElement.click`，
 * 调用时将同步发送一个和字段同名且全小写的自定义事件
 *
 * @example
 * ```ts
 *  class App extends GemElement {
 *    @emitter load: Function;
 *  }
 * ```
 */
export function emitter(target: BaseElement, event: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.defineEvents) con.defineEvents = [];
  con.defineEvents.push(event);
}

/**
 * 分配一个构造的样式表
 *
 * @example
 * ```ts
 *  @adoptedStyle(stylesheet)
 *  class App extends GemElement {}
 * ```
 */
export function adoptedStyle(style: Sheet<unknown>) {
  return function(cls: Function) {
    const c = cls as typeof BaseElement;
    if (!c.adoptedStyleSheets) c.adoptedStyleSheets = [];
    c.adoptedStyleSheets.push(style);
  };
}

/**
 * 链接一个 store，当 store 更新时更新元素
 *
 * @example
 * ```ts
 *  @connectStore(store)
 *  class App extends GemElement {}
 * ```
 */
export function connectStore(store: Store<unknown>) {
  // 这里的签名该怎么写？
  return function(cls: Function) {
    const c = cls as typeof BaseElement;
    if (!c.observedStores) c.observedStores = [];
    c.observedStores.push(store);
  };
}

/**
 * 定义自定义元素
 *
 * @example
 * ```ts
 *  @customElement('my-element')
 *  class App extends GemElement {}
 * ```
 */
export function customElement(name: string) {
  return function(cls: Function) {
    customElements.define(name, cls as CustomElementConstructor);
  };
}
