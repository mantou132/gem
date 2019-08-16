import { GemElement, html } from '../../';
import createModalElement from '../../elements/modal-base';
import '../../elements/link';
class Dialog1 extends createModalElement({ content: html`` }) {
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
      <div class="root" ?hidden=${!Dialog1.isOpen}>
        <div class="body">
          <h2>hello.</h2>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog1', Dialog1);

class Dialog extends createModalElement({ content: html`` }) {
  static shouldClose() {
    return confirm('confirm close dialog?');
  }

  openModal() {
    Dialog1.open({
      content: html`
        213
      `,
    });
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
      <div class="root" ?hidden=${!Dialog.isOpen}>
        <div class="body">
          <h2>hello.</h2>
          <div>${Dialog.store.content}</div>
          <button @click=${this.closeHandle}>x</button>
          <button @click=${this.openModal}>创建另一个 dialog</button>
          <app-dialog1></app-dialog1>
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
