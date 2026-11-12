import { Directive, directive } from './directive';
import type { ChildPart } from './lit-html';
import { setCommittedValue } from './repeat';

const INITIAL = Symbol();

class KeyedDirective extends Directive {
  #key: unknown = INITIAL;

  render(_key: unknown, value: unknown) {
    return value;
  }

  // 第一次渲染时不清除，水合时复用 SSR 的内容
  update(part: ChildPart, [key, value]: [unknown, unknown]) {
    if (this.#key !== INITIAL && key !== this.#key) setCommittedValue(part);
    this.#key = key;
    return value;
  }
}

/**
 * `key` 改变时丢弃原来的 DOM，重新创建内容，即使模板相同，例如页面参数改变时重新创建页面元素
 *
 * @example
 * ```ts
 * html`${keyed(this.id, html`<my-editor .id=${this.id}></my-editor>`)}`;
 * ```
 */
export const keyed = /*#__PURE__*/ directive(KeyedDirective) as (key: unknown, value: unknown) => unknown;
