import { GemElement, html, css } from '../../';
import '../../elements/link';
import '../../elements/route';
import '../../elements/title';

import './page-b';
import './page-c';

const routes = [
  {
    title: 'Page A Title',
    pattern: '/a',
    get content() {
      import('./page-a');
      return html`
        <app-page-a>A: </app-page-a>
      `;
    },
  },
  {
    title: 'Page B Title',
    pattern: '/b',
    content: html`
      <app-page-b>B: </app-page-b>
    `,
  },
  {
    title: 'Page C Title',
    pattern: '/c/*',
    content: html`
      <app-page-c>C: </app-page-c>
    `,
  },
  {
    pattern: '/',
    content: html`
      <div>hello</div>
    `,
  },
];

class App extends GemElement {
  render() {
    return html`
      <style>
        :host {
          text-align: center;
        }
        gem-link {
          cursor: pointer;
        }
        gem-link:hover {
          text-decoration: underline;
        }
      </style>
      <header><gem-title>Home Page Title</gem-title></header>
      <nav>
        <gem-link path="/">Home</gem-link>
        <gem-link path="/a">PageA</gem-link>
        <gem-link path="/b">PageB</gem-link>
        <gem-link path="/c/e">PageC</gem-link>
      </nav>
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `;
  }
}

const style = document.createElement('style');
style.innerHTML = css`
  body {
    font-size: xx-large;
  }
`;
document.head.append(style);

customElements.define('app-root', App);
document.body.append(new App());
