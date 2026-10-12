import { adoptedStyle, connectStore, css, customElement, GemElement, html } from '@mantou/gem';

import { headerStore } from '../stores';

const style = css`
  :scope {
    display: block;
    text-align: center;
    font-size: xx-large;
    margin-block: 1em;
  }
`;

@customElement('gem-ssr-header')
@adoptedStyle(style)
@connectStore(headerStore)
export class GemSsrHeaderElement extends GemElement {
  render = () => {
    return html`${headerStore.title}`;
  };
}
