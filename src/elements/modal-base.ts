import { GemElement, createStore, updateStore, history, html } from '../';

const open = Symbol('open mark');

/**
 * 导出一个函数，用来创建类似 Modal 元素的基类
 */
export default function createModalElement<T extends object>(options: T) {
  return class extends GemElement {
    static store = createStore({
      [open]: false,
      ...options,
    });

    static get isOpen() {
      return this.store[open];
    }

    static get observedStores() {
      return [history.historyState, this.store];
    }

    static open(opts: T) {
      updateStore(this.store, { [open]: true, ...opts });
      history.pushState({
        close: this.close.bind(this),
        colseBefore: this.closeBefore.bind(this),
      });
    }

    static close() {
      updateStore(this.store, { [open]: false, ...options });
    }

    static closeBefore() {
      return true;
    }

    constructor() {
      super();
      this.closeHandle = this.closeHandle.bind(this);
    }

    closeHandle() {
      history.back();
    }
    render() {
      return html``;
    }
  };
}
