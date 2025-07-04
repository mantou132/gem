import {
  adoptedStyle,
  createRef,
  createState,
  css,
  customElement,
  GemElement,
  html,
  render,
  shadow,
} from '@mantou/gem';
import { GemDialogBaseElement } from '@mantou/gem/elements/base/dialog';
import { createModalClass } from '@mantou/gem/elements/base/modal-factory';

import '@mantou/gem/elements/link';
import '../elements/layout';

@customElement('app-state')
class _AppState extends GemElement {
  state = createState({ count: 0 });
  #increment = () => {
    this.state({ count: this.state.count + 1 });
  };
  render() {
    return html`
      <button @click=${this.#increment}>count: ${this.state.count}</button>
    `;
  }
}

const confirmStyle = css`
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
    padding: 1em;
  }
`;

@customElement('app-confirm')
@adoptedStyle(confirmStyle)
@shadow()
class Confirm extends createModalClass({ content: html``, confirmHandle: () => {} }) {
  label = 'confirm title';

  #confirm = () => {
    Confirm.close();
    Confirm.store.confirmHandle();
  };

  render() {
    return html`
      <div class="root" ?hidden=${!Confirm.isOpen}>
        <div class="body">
          <h2>${Confirm.store.content}</h2>
          <button @click=${this.#confirm}>close dialog</button>
        </div>
      </div>
    `;
  }
}

const dialogStyle = css`
  :host {
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
    padding: 1em;
  }
`;

@customElement('app-dialog')
@adoptedStyle(dialogStyle)
@shadow()
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

  render = () => {
    if (!this.opened) return null;
    return html`
      <div class="root">
        <div class="body">
          <h2>Dialog Title</h2>
          <app-state></app-state>
          <slot></slot>
          <button @click=${this.close}>x</button>
        </div>
      </div>
    `;
  };
}

@customElement('app-root')
@shadow()
export class Root extends GemElement {
  #dialog = createRef<Dialog>();

  #state = createState({ modal: false });

  #clickHandle = () => this.#dialog.value?.open();

  render() {
    return html`
      <button ?inert=${this.#state.modal} @click=${this.#clickHandle}>open dialog</button>
      <app-dialog
        ${this.#dialog}
        label="dialog title"
        @open=${() => this.#state({ modal: true })}
        @close=${() => this.#state({ modal: false })}
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
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
