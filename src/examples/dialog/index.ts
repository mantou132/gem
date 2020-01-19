import { GemElement, html, emptyFunction } from '../../';
import createModalClass from '../../elements/modal-base';
import DialogBase from '../../elements/dialog-base';
import '../../elements/link';
class Confirm extends createModalClass({ content: html``, confirmHandle: emptyFunction }) {
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
          <h2>Confirm Title</h2>
          <button @click=${this.confirm}>close dialog</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-confirm', Confirm);

class Dialog extends DialogBase {
  shouldClose = () => {
    if (this.opened) {
      Confirm.open({
        content: html`
          Confirm?
        `,
        confirmHandle: () => {
          this.closeHandle();
          history.back();
        },
      });
      return false;
    } else {
      return true;
    }
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
      <div class="root" ?hidden=${!this.opened}>
        <div class="body">
          <h2>Dialog Title</h2>
          <slot></slot>
          <button @click=${this.close}>x</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog', Dialog);

class Root extends GemElement {
  clickHandle = () => {
    const dialog: Dialog | null | undefined = this.shadowRoot?.querySelector('app-dialog');
    dialog?.open();
  };

  render() {
    return html`
      <style>
        :host {
          font-size: x-large;
        }
      </style>
      <button @click="${this.clickHandle}">open dialog</button>
      <app-dialog>
        <div>dialog body</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      </app-dialog>
    `;
  }
}
customElements.define('app-root', Root);

document.body.append(new Root());
document.body.append(new Confirm());
