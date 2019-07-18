import { GemElement, html, raw } from '../../';

class App extends GemElement {
  state = { now: 0 };
  constructor() {
    super(false);
    setInterval(() => {
      this.setState({ now: Date.now() });
    }, 1000);
  }

  render() {
    return html`
      <div>hello world!</div>
      <time>${this.state.now}</time>
    `;
  }
}

customElements.define('app-root', App);

document.body.append(new App());

const style = document.createElement('style');
document.body.append(style);
style.outerHTML = raw`<style>div{color: red}</style>`;
