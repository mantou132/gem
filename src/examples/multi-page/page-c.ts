import { GemElement, html } from '../../';
import '../../elements/route';

setTimeout(() => import(`../../${`elem${''}ents`}/${'ti' + 'tle'}?123`));

const routes = [
  {
    title: 'ccccccd',
    pattern: '/c/d',
    content: html`
      <div>C/D</div>
    `,
  },
  {
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
        <gem-link path="/c/d">Page c/d</gem-link>
        <gem-link path="/c/e">Page c/e</gem-link>
        <gem-route .routes=${routes}></gem-route>
      `;
    }
  },
);
