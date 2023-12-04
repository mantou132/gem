import { GemElement } from '../../lib/element';
import { attribute, state, connectStore } from '../../lib/decorators';
import { history } from '../../lib/history';

/**
 * 在模版中声明的 dialog，使用 `open` 方法 打开；
 * 如果要应用关闭动画，可以在动画执行完后设置 `hidden` 属性；
 * 模拟 top layer：https://github.com/whatwg/html/issues/4633.
 *
 * @attr label
 * @fires open
 * @fires close
 */
@connectStore(history.store)
export abstract class GemDialogBaseElement extends GemElement {
  @attribute label: string;
  @state opened: boolean;

  inert = true;

  #nextSibling: ChildNode | null;
  #parentElement: Node | null;
  #inertStore: HTMLElement[] = [];

  constructor() {
    super();
    this.internals.role = 'dialog';
    this.internals.ariaModal = 'true';
  }

  /**
   * @final
   * 进入关闭状态
   */
  closeHandle = () => {
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
   * @final
   * 进入打开状态
   */
  openHandle = () => {
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

  /**@final */
  open = () => {
    if (this.opened) return;
    this.openHandle();
    history.push({
      title: this.label,
      open: this.openHandle,
      close: this.closeHandle,
      shouldClose: this.shouldClose,
    });
  };

  shouldClose() {
    return true;
  }

  /**@final */
  close = () => {
    history.back();
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
  };
}
