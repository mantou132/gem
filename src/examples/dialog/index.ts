import { GemElement, createStore, updateStore, history, html, ifDefined, TemplateResult } from '../../';
import '../../elements/link';

// 新建全局数据对象
const dialog = createStore({
  open: false,
  content: null,
});
class Dialog extends GemElement {
  static observedStores = [history.historyState, dialog];

  static open(content?: TemplateResult) {
    updateStore(dialog, { open: true, content });
    history.pushState({ close: Dialog.close, colseBefore: Dialog.closeBefore });
  }

  static close() {
    updateStore(dialog, { open: false, content: null });
  }

  static closeBefore() {
    return confirm('confirm close dialog?');
  }

  closeHandle() {
    history.back(); // 恢复历史栈
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
      <div class="root" hidden=${ifDefined(dialog.open && undefined)}>
        <div class="body">
          <h2>hello.</h2>
          <div>${dialog.content}</div>
          <button @click=${this.closeHandle}>x</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-dialog', Dialog);

class Root extends GemElement {
  clickHandle = () =>
    Dialog.open(
      html`
        <div>dialog</div>
        <gem-link path="/hi" style="cursor: pointer; color: blue">replace route</gem-link>
      `,
    );
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
