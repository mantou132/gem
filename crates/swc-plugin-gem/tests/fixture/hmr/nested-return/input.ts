// @ts-nocheck
class GemElement extends HTMLElement {
  #renderRoot;
  #effectList = [];
  constructor() {
    super();
    this.#effectList.push({
      callback: () => {
        if (cond) {
          return addListener(this, 'click');
        }
      },
    });
    const { mode } = this.#metadata;
  }
  get #metadata() {
    return this.constructor[Symbol.metadata];
  }
}
