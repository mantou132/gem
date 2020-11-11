import { GemElement, connectStore, history, state } from '..';

/**
 * 在模版中声明的 dialog，使用 `open` 方法 打开
 */
@connectStore(history.store)
export abstract class DialogBaseElement extends GemElement {
  @state opened = false;

  /**
   * @final
   * 进入关闭状态
   */
  closeHandle = () => {
    this.opened = false;
  };

  /**
   * @final
   * 进入打开状态
   */
  openHandle = () => {
    this.opened = true;
  };

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

  /**
   * @final
   * 跳过 `shouldClose` 强制关闭
   * 避免 `shouldClose` 中造成无限循环
   */
  forceClose = () => {
    this.closeHandle();
    history.back();
  };
}
