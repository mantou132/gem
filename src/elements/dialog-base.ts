import { GemElement, connectStore, history, state } from '..';

/**
 * 在模版中声明的 dialog，使用 `open` 方法 打开
 */
@connectStore(history.store)
export default abstract class DialogBase extends GemElement {
  @state opened = false;

  /**@final */
  closeHandle() {
    this.opened = false;
  }

  /**@final */
  openHandle() {
    this.opened = true;
  }

  constructor() {
    super();
    this.closeHandle = this.closeHandle.bind(this);
    this.openHandle = this.openHandle.bind(this);
    this.shouldClose = this.shouldClose.bind(this);
  }

  /**@final */
  open = () => {
    if (this.opened) return;
    this.openHandle();
    history.push({
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
}
