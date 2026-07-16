import { Stack } from 'tap-ui/elements/stack';
import { contentsContainer } from 'tap-ui/lib/styles';
import { theme } from 'tap-ui/lib/theme';

import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';

const style = css`
  .body {
    padding: 1em;
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

@customElement('tap-app-profile')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TapAppProfileElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Profile" back @backclick=${() => Stack.close()}></tap-navbar>
      <div class="body">
        <div class="avatar">M</div>
        <p><strong>Mantou</strong></p>
        <p>Stack pages support gesture close by default.</p>
      </div>
    </tap-page>
  `;
}
