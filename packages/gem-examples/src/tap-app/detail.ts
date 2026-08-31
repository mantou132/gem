import { Stack } from '@mantou/tap-ui/elements/stack';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';
import { theme } from '@mantou/tap-ui/lib/theme';

import './profile';

const style = css`
  .body {
    padding-block-start: 4em;
    line-height: 1.6;
    color: ${theme.textColor};
    p:first-of-type {
      margin-block-start: 0;
    }
  }
  .hero {
    height: calc(12em + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));
    background: linear-gradient(160deg, ${theme.hoverBackgroundColor}, ${theme.borderColor});
  }
  .body p + p {
    margin-block-start: 0.75em;
  }
  tap-button {
    margin-block: 0.75em;
  }
`;

@customElement('t-detail')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TDetailElement extends GemElement {
  #openProfile = () => {
    Stack.push({
      content: html`<t-profile></t-profile>`,
    });
  };

  @template()
  #render = () => html`
    <tap-page floatheader>
      <tap-navbar slot="header" title="Detail" back @backclick=${() => Stack.close()}></tap-navbar>
      <div class="hero"></div>
      <tap-content class="body">
        <p>Swipe right from the left edge to close this page.</p>
        <p>You can also tap the back button in the navbar.</p>
        <tap-button @click=${this.#openProfile}>Open Profile</tap-button>
        <p>Scroll down to see the floating header gain a background.</p>
        <p>${'More content. '.repeat(60)}</p>
      </tap-content>
    </tap-page>
  `;
}
