import { GemElement, html, customElement, refobject, RefObject, render } from '@mantou/gem';
import { createModalClass } from '@mantou/gem/elements/base/modal-factory';
import { GemDialogBaseElement } from '@mantou/gem/elements/base/dialog';

import '@mantou/gem/elements/link';
import '../elements/layout';

@customElement('app-confirm')
class Confirm extends createModalClass({
  content: html``,
  confirmHandle: () => {
    /** */
  },
}) {
  label = 'confirm title';

  confirm = () => {
    Confirm.close();
    Confirm.store.confirmHandle();
  };

  render() {
    return html`
      <style>
        .root {
          position: fixed;
          z-index: 3;
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
class Dialog extends GemDialogBaseElement {
  shouldClose = () => {
    if (this.opened) {
      Confirm.open({
        content: html`Confirm?`,
        confirmHandle: this.forceClose, // 不能使用 `close` 方法
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
        :host(:where([data-opened], :state(opened))) {
          display: block;
        }
        .root {
          position: fixed;
          z-index: 2;
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
export class Root extends GemElement {
  @refobject dialog: RefObject<Dialog>;

  state = {
    modal: false,
  };

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
      <button ?inert=${this.state.modal} @click="${this.clickHandle}">open dialog</button>
      <app-dialog
        label="dialog title"
        ref=${this.dialog.ref}
        @open=${() => this.setState({ modal: true })}
        @close=${() => this.setState({ modal: false })}
      >
        <div>dialog body</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      </app-dialog>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
