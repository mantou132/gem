import { adoptedStyle, css, customElement, GemElement, html, shadow, template } from '@mantou/gem';
import '@mantou/gem/elements/route';
import '@mantou/gem/elements/link';

const routes = [
  {
    title: 'ccccccd',
    pattern: '/c/d',
    content: html`<div>C/D</div>`,
  },
  {
    // `title` 未设置会使用父路由标题
    pattern: '/c/e',
    content: html`<div>C/E</div>`,
  },
  {
    pattern: '/c/*',
    content: html`<div>C/E</div>`,
  },
];

const style = css`
  gem-link + gem-link {
    margin-left: 0.5em;
  }
`;

@adoptedStyle(style)
@customElement('app-page-c')
@shadow()
class _AppPageC extends GemElement {
  @template()
  #render = () => {
    return html`
      <gem-link path="./d">Page c/d</gem-link>
      <gem-link path="./e">Page c/e</gem-link>
      <gem-route .routes=${routes}></gem-route>
      inert route:
      <gem-route ?inert=${true} .routes=${routes}></gem-route>
    `;
  };
}
