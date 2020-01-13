import { GemElement, html, updateStore, emptyFunction } from '../../';
import createModalElement from '../../elements/modal-base';
import '../../elements/link';
class Confirm extends createModalElement({ content: html``, confirmHandle: emptyFunction }) {
  confirm = () => {
    Confirm.store.confirmHandle();
    Confirm.close();
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
          <h2>hello.</h2>
          <button @click=${this.confirm}>close dialog</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog1', Confirm);

class Dialog extends createModalElement({ content: html``, confrimed: false }) {
  static openConfirm() {
    Confirm.open({
      content: html`
        321
      `,
      confirmHandle() {
        updateStore(Dialog.store, { confrimed: true });
        Dialog.close();
      },
    });
  }

  static shouldClose() {
    if (!Dialog.store.confrimed) {
      Dialog.openConfirm();
      return false;
    } else {
      return true;
    }
  }

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
      <div class="root" ?hidden=${!Dialog.isOpen}>
        <div class="body">
          <h2>hello.</h2>
          <slot></slot>
          <div>${Dialog.store.content}</div>
          <button @click=${() => history.back()}>x</button>
          <app-dialog1></app-dialog1>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog', Dialog);

class Root extends GemElement {
  clickHandle = () => {
    Dialog.open({
      confrimed: false,
      content: html`
        <div>dialog</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      `,
    });
  };

  render() {
    return html`
      <style>
        :host {
          font-size: x-large;
        }
      </style>
      <button @click="${this.clickHandle}">open dialog</button>
      <app-dialog>slot content</app-dialog>
    `;
  }
}
customElements.define('app-root', Root);

document.body.append(new Root());
