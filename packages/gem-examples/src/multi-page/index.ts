import { GemElement, customElement, html, render, shadow } from '@mantou/gem';
import '@mantou/gem/elements/title';
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
    pattern: '/b',
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

@customElement('app-root')
@shadow()
class _App extends GemElement {
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
      <header><gem-title prefix=${'😊'}>AppName</gem-title></header>
      <nav>
        <gem-link path="/">Home</gem-link>
        <gem-link path="/a">PageA</gem-link>
        <gem-link path="/b">PageB</gem-link>
        <gem-link path="/c/e" pattern="/c/*">PageC</gem-link>
      </nav>
      <main><gem-light-route .routes=${routes}></gem-light-route></main>
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
