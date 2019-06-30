var _a;
import { Component, html, history } from '../';
customElements.define('app-link', (_a = class extends Component {
        constructor() {
            super();
            this.clickHandle = () => {
                const { $close } = history.location.state;
                const path = this.getAttribute('path');
                const query = this.getAttribute('query') || '';
                if (!this.active) {
                    if ($close) {
                        history.back();
                        setTimeout(() => {
                            history.push({ path, query });
                        }, 200);
                    }
                    else {
                        history.push({ path, query });
                    }
                }
            };
            this.onclick = this.clickHandle;
        }
        get active() {
            const path = this.getAttribute('path');
            const query = this.getAttribute('query') || '';
            const { href } = history.location;
            return path + query === href;
        }
        render() {
            if (this.active) {
                this.setAttribute('active', '');
            }
            else {
                this.removeAttribute('active');
            }
            return html `
        <style>
          :host {
            display: contents;
          }
        </style>
        <slot></slot>
      `;
        }
    },
    _a.observedStores = [history.historyState],
    _a));
//# sourceMappingURL=link.js.map