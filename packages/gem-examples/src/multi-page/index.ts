import { GemElement, html, render } from '@mantou/gem';
import { GemTitleElement } from '@mantou/gem/elements/title';
import '@mantou/gem/elements/route';
import '@mantou/gem/elements/link';

import '../elements/layout';

import './page-b';
import './page-c';

const routes = [
  {
    pattern: '/',
    redirect: '/c/e',
  },
  {
    title: 'Page A Title',
    pattern: '/a',
    get content() {
      import('./page-a');
      return html`<app-page-a>A: </app-page-a>`;
    },
  },
  {
    title: 'Page B Title',
    pattern: '/B',
    content: html` <app-page-b>B: </app-page-b> `,
  },
  {
    title: 'Page C Title',
    pattern: '/c/*',
    content: html`<app-page-c>C: </app-page-c>`,
  },
  {
    pattern: '/',
    content: html`<div>hello</div>`,
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
        gem-link + gem-link {
          margin-left: 0.5em;
        }
        gem-link:hover {
          text-decoration: underline;
        }
      </style>
      <header><gem-title suffix=${GemTitleElement.defaultSuffix}>AppName</gem-title></header>
      <nav>
        <gem-link path="/">Home</gem-link>
        <gem-link path="/A">PageA</gem-link>
        <gem-link path="/b">PageB</gem-link>
        <gem-link path="/c/e" pattern="/c/*">PageC</gem-link>
      </nav>
      <main><gem-light-route .routes=${routes}></gem-light-route></main>
    `;
  }
}

customElements.define('app-root', App);

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
