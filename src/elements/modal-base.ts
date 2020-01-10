import { GemElement, createStore, updateStore, history, html } from '../';

const open = Symbol('open mark');

/**
 * 导出一个函数，用来创建类似 Modal 元素的基类
 * 需要使用 Modal 的静态方式所以使用 Store 来管理组件状态
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
      return [history.store, this.store];
    }

    static open(opts: T) {
      const changeStore = () => updateStore(this.store, { [open]: true, ...opts });
      changeStore();
      history.push({
        open: changeStore,
        close: this.close.bind(this),
        shouldClose: this.shouldClose.bind(this),
      });
    }

    static close() {
      updateStore(this.store, { [open]: false, ...options });
    }

    static shouldClose() {
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
