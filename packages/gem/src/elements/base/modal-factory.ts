/** biome-ignore-all lint/complexity/noThisInStatic: base class */
import { aria, mounted, shadow } from '../../lib/decorators';
import { history } from '../../lib/history';
import { GemElement } from '../../lib/reactive';
import { connect, createStore } from '../../lib/store';

const open = Symbol('open mark');

/**
 * 需要使用范型，所以导出一个函数，用来*创建*类似 Confirm 元素的基类;
 * 需要使用 Confirm 的静态方式所以使用 Store 来管理组件状态;
 * 返回 *单实例* Confirm 类;
 * 关闭时将立即移除实例，所以不支持动画；
 * 使用 `mounted`/`unmounted` 定义 `open`/`close` 回调;
 * 模拟 top layer：https://github.com/whatwg/html/issues/4633.
 */
export function createModalClass<T extends Record<string, unknown>>(options: T) {
  const final = Symbol();

  @shadow()
  @aria({ role: 'alertdialog', ariaModal: 'true' })
  class ModalElement extends GemElement {
    static inertStore: HTMLElement[] = [];
    static instance: GemElement | null = null;
    /**
     * @final
     * modal 状态，包括内容，是否已经确认关闭等属性
     */
    static store = createStore({
      [open]: false,
      ...options,
    });

    /**@final */
    static get isOpen() {
      return this.store[open];
    }

    /**
     * @final
     * 自带 100ms 延迟，以允许在其他 Dialog 的 `shouldClose` 中调用此方法;
     * 浏览器 history 为异步 API，需要设置较长延迟;
     */
    static open(opts: T) {
      const instance = new this();
      this.instance = instance;
      this.inertStore = ([...document.body.children] as HTMLElement[]).filter((e) => !e.inert);
      this.inertStore.forEach((e) => (e.inert = true));
      document.body.append(instance);
      const changeStore = () => this.store({ [open]: true, ...opts });
      setTimeout(() => {
        changeStore();
        history.push({
          title: instance.label,
          open: changeStore,
          close: this.closeHandle.bind(this),
          shouldClose: this.shouldClose.bind(this),
        });
      }, 100);
      return final;
    }

    /**
     * @final
     * UI 中执行关闭
     */
    static close() {
      history.back();
      return final;
    }

    /**
     * @final
     * history 中自动调用
     */
    static closeHandle() {
      this.inertStore.forEach((e) => (e.inert = false));
      this.instance?.remove();
      this.store({ [open]: false, ...options });
      return final;
    }

    /**
     * 由于要操作浏览器历史记录，所以没有设计为 Promise；
     */
    static shouldClose() {
      return true;
    }

    label = '';

    @mounted()
    #connectHistory = () => connect(history.store, this.update);

    @mounted()
    #connectStore = () => connect(ModalElement.store, this.update);
  }

  return ModalElement;
}
