import { GemElement, html, ifDefined } from '../../';
import createModalElement from '../../elements/modal-base';
import '../../elements/link';

class Dialog extends createModalElement({ content: html`` }) {
  static closeBefore() {
    return confirm('confirm close dialog?');
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
      <div class="root" hidden=${ifDefined(Dialog.isOpen && undefined)}>
        <div class="body">
          <h2>hello.</h2>
          <div>${Dialog.store.content}</div>
          <button @click=${this.closeHandle}>x</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog', Dialog);

class Root extends GemElement {
  clickHandle = () =>
    Dialog.open({
      content: html`
        <div>dialog</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      `,
    });
  render() {
    return html`
      <style>
        :host {
          font-size: x-large;
        }
      </style>
      <button @click="${this.clickHandle}">open dialog</button>
      <app-dialog></app-dialog>
    `;
  }
}
customElements.define('app-root', Root);

document.body.append(new Root());
