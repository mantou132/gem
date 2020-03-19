import { GemElement, html } from '../../';
import '../../elements/route';

const routes = [
  {
    title: 'ccccccd',
    pattern: '/c/d',
    content: html`
      <div>C/D</div>
    `,
  },
  {
    // `title` 未设置会使用父路由标题
    pattern: '/c/e',
    content: html`
      <div>C/E</div>
    `,
  },
  {
    pattern: '/c/*',
    content: html`
      <div>C/E</div>
    `,
  },
];

customElements.define(
  'app-page-c',
  class extends GemElement {
    render() {
      return html`
        <style>
          gem-link + gem-link {
            margin-left: 0.5em;
          }
        </style>
        <gem-link path="/c/d">Page c/d</gem-link>
        <gem-link path="/c/e">Page c/e</gem-link>
        <gem-route .routes=${routes}></gem-route>
      `;
    }
  },
);
