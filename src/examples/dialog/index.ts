import { GemElement, html, customElement, refobject, RefObject } from '../../';
import { createModalClass } from '../../elements/modal-base';
import { DialogBase } from '../../elements/dialog-base';
import '../../elements/link';

@customElement('app-confirm')
class Confirm extends createModalClass({
  content: html``,
  confirmHandle: () => {
    /** */
  },
}) {
  confirm = () => {
    Confirm.close();
    Confirm.store.confirmHandle();
  };

  render() {
    return html`
      <style>
        .root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }
        .body {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 100px;
          background: white;
        }
      </style>
      <div class="root" ?hidden=${!Confirm.isOpen}>
        <div class="body">
          <h2>${Confirm.store.content}</h2>
          <button @click=${this.confirm}>close dialog</button>
        </div>
      </div>
    `;
  }
}

@customElement('app-dialog')
class Dialog extends DialogBase {
  shouldClose = () => {
    if (this.opened) {
      Confirm.open({
        content: html`Confirm?`,
        confirmHandle: this.forceClose,
      });
      return false;
    } else {
      return true;
    }
  };

  render() {
    return html`
      <style>
        :host {
          display: none;
        }
        :host(.opened) {
          display: block;
        }
        .root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(5px);
        }
        .body {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          height: 200px;
          background: white;
        }
      </style>
      <div class="root">
        <div class="body">
          <h2>Dialog Title</h2>
          <slot></slot>
          <button @click=${this.close}>x</button>
        </div>
      </div>
    `;
  }
}

@customElement('app-root')
class Root extends GemElement {
  @refobject dialog: RefObject<Dialog>;

  clickHandle = () => {
    this.dialog.element?.open();
  };

  render() {
    return html`
      <style>
        :host {
          font-size: x-large;
        }
      </style>
      <button @click="${this.clickHandle}">open dialog</button>
      <app-dialog ref=${this.dialog.ref}>
        <div>dialog body</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      </app-dialog>
    `;
  }
}

document.body.append(new Root());
