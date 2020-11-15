import { html, render } from '../../';

import '../../elements/unsafe';

import '../elements/layout';

const svgStr = `
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
`;
const svgStyle = `
  svg {
    transform: scale(2);
  }
`;
const htmlStr = `
  <pre><code>// code code code</code></pre>
`;

const app = html`
  <div slot="main">
    <gem-unsafe content="${svgStr}" contentcss="${svgStyle}"></gem-unsafe>
    <gem-unsafe content="${htmlStr}"></gem-unsafe>
  </div>
`;

render(html`<gem-examples-layout>${app}</gem-examples-layout>`, document.body);
