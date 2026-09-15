import { Stack } from '@mantou/tap-ui/elements/stack';
import { icons } from '@mantou/tap-ui/lib/icons';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';
import { theme } from '@mantou/tap-ui/lib/theme';

import '@mantou/tap-ui/elements/use';

const style = css`
  .body {
    line-height: 1.6;
    color: ${theme.textColor};
  }
  .avatar {
    width: 4em;
    height: 4em;
    margin-block-end: 1em;
    border-radius: 50%;
    background: ${theme.hoverBackgroundColor};
    display: grid;
    place-items: center;
    font-size: 1.5em;
  }
`;

@customElement('t-profile')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TProfileElement extends GemElement {
  #close = () => {
    Stack.getClosestStack(this)?.pop();
  };

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Profile" subtitle="@mantou">
        <tap-use
          slot="left"
          role="button"
          aria-label="close"
          .element=${icons.close}
          @click=${this.#close}
        ></tap-use>
      </tap-navbar>
      <tap-content class="body">
        <div class="avatar">M</div>
        <p><strong>Mantou</strong></p>
        <p>Stack pages support gesture close by default.</p>
      </tap-content>
    </tap-page>
  `;
}
