import { GemElement, createStore, updateStore, history } from '../';

const open = Symbol('open mark');

/**
 * 导出一个函数，用来*创建*类似 Modal 元素的基类;
 * 需要使用 Modal 的静态方式所以使用 Store 来管理组件状态;
 */
export default function createModalClass<T extends object>(options: T) {
  /**
   * 导出*单实例* Modal 类
   */
  return class extends GemElement {
    /**
     * modal 状态，包括内容，是否已经确认关闭等属性
     */
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

    /**
     * 自带 100ms 延迟，以便在 `shouldClose` 中调用此方法;
     * 浏览器 history 为异步 API，需要设置较长延迟;
     */
    static open(opts: T) {
      const changeStore = () => updateStore(this.store, { [open]: true, ...opts });
      setTimeout(() => {
        changeStore();
        history.push({
          open: changeStore,
          close: this.closeHandle.bind(this),
          shouldClose: this.shouldClose.bind(this),
        });
      }, 100);
    }

    /**
     * UI 中执行关闭
     */
    static close() {
      history.back();
    }

    /**
     * history 中自动调用
     */
    static closeHandle() {
      updateStore(this.store, { [open]: false, ...options });
    }

    /**
     * 由于要操作浏览器历史记录，所以没有设计为 Promise；
     */
    static shouldClose() {
      return true;
    }
  };
}
