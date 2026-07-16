import { Stack } from 'tap-ui/elements/stack';
import { contentsContainer } from 'tap-ui/lib/styles';
import { theme } from 'tap-ui/lib/theme';

import 'tap-ui/elements/button';
import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';

import './profile';

const style = css`
  .body {
    padding: 1em;
    padding-block-start: 4em;
    line-height: 1.6;
    color: ${theme.textColor};
  }
  .hero {
    height: 12em;
    margin: -4em -1em 1em;
    background: linear-gradient(160deg, ${theme.hoverBackgroundColor}, ${theme.borderColor});
  }
  .body p + p {
    margin-block-start: 0.75em;
  }
  tap-button {
    margin-block: 0.75em;
  }
`;

@customElement('tap-app-detail')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TapAppDetailElement extends GemElement {
  #openProfile = () => {
    Stack.push({
      content: html`<tap-app-profile></tap-app-profile>`,
    });
  };

  @template()
  #render = () => html`
    <tap-page floatheader>
      <tap-navbar slot="header" title="Detail" back @backclick=${() => Stack.close()}></tap-navbar>
      <div class="body">
        <div class="hero"></div>
        <p>Swipe right from the left edge to close this page.</p>
        <p>You can also tap the back button in the navbar.</p>
        <tap-button @click=${this.#openProfile}>Open Profile</tap-button>
        <p>Scroll down to see the floating header gain a background.</p>
        <p>${'More content. '.repeat(40)}</p>
      </div>
    </tap-page>
  `;
}
