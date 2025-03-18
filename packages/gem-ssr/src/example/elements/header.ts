import { GemElement, html, adoptedStyle, customElement, css } from '@mantou/gem';

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
export class GemSsrHeaderElement extends GemElement {
  render = () => {
    return html`Header`;
  };
}
