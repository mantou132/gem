import { html, render } from '../../';

import '../../elements/use';

import '../elements/layout';

const app = html`
  <div slot="main">
    <template id="icon">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    </template>
    <gem-use .root=${document.body} selector="#icon"></gem-use>
    <gem-use selector="#icon"></gem-use>
  </div>
`;

render(html`<gem-examples-layout>${app}</gem-examples-layout>`, document.body);
