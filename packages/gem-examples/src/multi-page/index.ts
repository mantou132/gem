import { render } from '@mantou/gem';

import './page-b';
import './page-c';

// 没写 `basePath`

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
    pattern: '/empty',
    content: html``,
  },
  {
    pattern: '/*',
    content: html`<div>
      <gem-light-route
        .routes=${[
          {
            pattern: '/*',
            content: html`pattern match`,
          },
        ]}
      ></gem-light-route>
    </div>`,
  },
];

const style = css`
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
`;

@adoptedStyle(style)
@customElement('app-root')
@shadow()
class _App extends GemElement {
  @template()
  #render = () => {
    return html`
      <header><gem-title prefix=${'😊'}>AppName</gem-title></header>
      <nav>
        <gem-link path="/">Home</gem-link>
        <gem-link path="/a">PageA</gem-link>
        <gem-link path="/b">PageB</gem-link>
        <gem-link path="/c/e" pattern="/c/*">PageC</gem-link>
        <gem-link path="/empty">Empty</gem-link>
        <gem-link path="/test">Test</gem-link>
      </nav>
      <main><gem-light-route .routes=${routes}></gem-light-route></main>
    `;
  };
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
