import { aria, attribute, connectStore, state, willMount } from '../../lib/decorators';
import { history } from '../../lib/history';
import { GemElement } from '../../lib/reactive';

const final = Symbol();

/**
 * 在模版中声明的 dialog，使用 `open` 方法 打开；
 * 模拟 top layer：https://github.com/whatwg/html/issues/4633.
 */
@connectStore(history.store)
@aria({ role: 'dialog', ariaModal: 'true' })
export abstract class GemDialogBaseElement extends GemElement {
  @attribute label: string;
  @state opened: boolean;

  #nextSibling: ChildNode | null;
  #parentElement: Node | null;
  #inertStore: HTMLElement[] = [];

  /**
   * 进入关闭状态
   */
  #closeHandle = () => {
    this.inert = true;
    this.#inertStore.forEach((e) => (e.inert = false));
    if (this.#nextSibling) {
      this.#nextSibling.before(this);
    } else if (this.#parentElement) {
      this.#parentElement?.appendChild(this);
    }
    this.dispatchEvent(new CustomEvent('close'));
    this.opened = false;
  };

  /**
   * 进入打开状态
   */
  #openHandle = () => {
    this.hidden = false;
    this.inert = false;
    this.#nextSibling = this.nextSibling;
    this.#parentElement = this.parentElement || this.getRootNode();
    this.#inertStore = ([...document.body.children] as HTMLElement[]).filter((e) => !e.inert);
    this.#inertStore.forEach((e) => (e.inert = true));
    document.body.append(this);
    this.dispatchEvent(new CustomEvent('open'));
    this.opened = true;
  };

  @willMount()
  #init = () => (this.inert = true);

  /**@final */
  open = () => {
    if (this.opened) return;
    this.#openHandle();
    history.push({
      title: this.label,
      open: this.#openHandle,
      close: this.#closeHandle,
      shouldClose: this.shouldClose,
    });
    return final;
  };

  shouldClose() {
    return true;
  }

  /**@final */
  close = () => {
    history.back();
    return final;
  };

  /**
   * @final
   * 跳过 `shouldClose` 强制关闭
   * 避免 `shouldClose` 中造成无限循环
   * 延时关闭避免同步操作 history
   */
  forceClose = () => {
    this.opened = false;
    setTimeout(this.close, 100);
    return final;
  };
}
