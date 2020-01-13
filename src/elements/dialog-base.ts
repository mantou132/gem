import { html, GemElement, connectStore, history } from '..';

@connectStore(history.store)
export default abstract class DialogBase extends GemElement {
  get isOpen() {
    return this.hasAttribute('open');
  }

  closeHandle() {
    this.removeAttribute('open');
  }

  openHandle() {
    this.setAttribute('open', '');
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
    if (this.isOpen) return;
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

  render() {
    return html``;
  }
}
