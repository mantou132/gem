/**
 * target 并非元素，而是类的原型对象
 * 不能在 target 上使用 DOM API
 * 类定义之后立即执行，自定义元素可以在实例化时覆盖原型对象上的属性
 */

import { GemBaseElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase } from './utils';

export type RefObject<T = GemBaseElement> = { ref: string; element: T | null };

/**
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
export function refobject(target: GemBaseElement, prop: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.defineRefs ||= []).push(prop);
  const attr = camelToKebabCase(prop);
  Object.defineProperty(target, prop, {
    get() {
      const that = this as GemBaseElement;
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
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @attribute attr: string;
 *  }
 * ```
 */
function defineAttr(target: GemBaseElement, attr: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.observedAttributes ||= []).push(attr);
}
export function boolattribute(target: GemBaseElement, prop: string) {
  const attr = camelToKebabCase(prop);
  const con = target.constructor as typeof GemBaseElement;
  (con.booleanAttributes ||= new Set()).add(attr);
  defineAttr(target, attr);
}
export function numattribute(target: GemBaseElement, prop: string) {
  const attr = camelToKebabCase(prop);
  const con = target.constructor as typeof GemBaseElement;
  (con.numberAttributes ||= new Set()).add(attr);
  defineAttr(target, attr);
}
export function attribute(target: GemBaseElement | typeof Boolean | typeof Number, prop: string) {
  defineAttr(target as GemBaseElement, camelToKebabCase(prop));
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
export function property(target: GemBaseElement, prop: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.observedPropertys ||= []).push(prop);
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
export function state(target: GemBaseElement, prop: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.defineCSSStates ||= []).push(prop);
  Object.defineProperty(target, prop, {
    get() {
      const that = this as GemBaseElement;
      return !!that.internals?.states?.contains(prop);
    },
    set(v: boolean) {
      const that = this as GemBaseElement;
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
 * 定义一个内部 slot，默认值即为字段名，不能使用全局属性 `slot`
 * 将来也可能用于 IDE 识别
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @slot slot: string;
 *  }
 * ```
 */
export function slot(target: GemBaseElement, prop: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.defineSlots ||= []).push(prop);
  (target as any)[prop] = prop;
}

/**
 * 定义一个内部 part，默认值即为字段名，不能使用全局属性 `part`
 * 将来也可能用于 IDE 识别
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @part part: string;
 *  }
 * ```
 */
export function part(target: GemBaseElement, prop: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.defineParts ||= []).push(prop);
  (target as any)[prop] = prop;
}

export type Emitter<T = any> = (detail: T, options?: Omit<CustomEventInit<unknown>, 'detail'>) => void;

/**
 * 定义一个事件发射器，类似 `HTMLElement.click`，
 * 调用时将同步发送一个和字段同名且全小写的自定义事件
 *
 * For example
 * ```ts
 *  class App extends GemElement {
 *    @emitter load: Function;
 *  }
 * ```
 */
export function emitter(target: GemBaseElement, event: string) {
  const con = target.constructor as typeof GemBaseElement;
  (con.defineEvents ||= []).push(event);
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
    const con = cls as typeof GemBaseElement;
    (con.adoptedStyleSheets ||= []).push(style);
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
    const con = cls as typeof GemBaseElement;
    (con.observedStores ||= []).push(store);
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
    customElements.define(name, cls as CustomElementConstructor);
  };
}
