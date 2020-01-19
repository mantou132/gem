import { GemElement, connectStore, history, state } from '..';

@connectStore(history.store)
export default abstract class DialogBase extends GemElement {
  @state opened = false;

  closeHandle() {
    this.opened = false;
  }

  openHandle() {
    this.opened = true;
  }

  shouldClose() {
    return true;
  }

  constructor() {
    super();
    this.closeHandle = this.closeHandle.bind(this);
    this.openHandle = this.openHandle.bind(this);
    this.shouldClose = this.shouldClose.bind(this);
  }

  open = () => {
    if (this.opened) return;
    this.openHandle();
    history.push({
      open: this.openHandle,
      close: this.closeHandle,
      shouldClose: this.shouldClose,
    });
  };

  close = () => {
    history.back();
  };
}
