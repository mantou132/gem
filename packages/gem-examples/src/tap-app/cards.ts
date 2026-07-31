import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { contentsContainer } from 'tap-ui/lib/styles';
import { theme } from 'tap-ui/lib/theme';

import 'tap-ui/elements/card';
import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';

const style = css`
  .intro,
  .card-copy {
    margin: 1em;
  }
  .intro {
    color: ${theme.textColor};
  }
  .card-copy {
    line-height: 1.65;
  }
  .hero {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 13em;
    padding: 1.25em;
    box-sizing: border-box;
    color: #fff;
    background: linear-gradient(145deg, #536dfe, #7c4dff);
  }
  .hero.teal {
    background: linear-gradient(145deg, #00897b, #26a69a);
  }
  .hero h2 {
    margin: 0;
    font-size: 1.6em;
  }
  .hero p {
    margin: 0.35em 0 0;
    opacity: 0.78;
  }
  .close-hint {
    margin-block-start: 1em;
    color: ${theme.describeColor};
    font-size: 0.875em;
  }
`;

const copy = html`
  <div slot="expandable" class="card-copy">
    <p>Expandable cards keep the preview and detail content in one DOM tree. The card is clipped while closed and becomes its own scroll container after opening.</p>
    <p>Pull down from the top of the detail to dismiss it. The page header and bottom tab bar move out of the way through a shared store, so the card can use the complete viewport.</p>
    <p>Long content stays mounted throughout the transition. Only transforms and opacity are animated, which prevents text from reflowing during the opening animation.</p>
    <p>${'This is additional detail content for scrolling. '.repeat(12)}</p>
  </div>
`;

@customElement('tap-app-cards')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TapAppCardsElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Cards"></tap-navbar>
      <div class="intro">
        <p>Android-style expandable cards inspired by Framework7.</p>
        <p class="close-hint">Tap a card, then scroll and pull down at the top to close.</p>
      </div>
      <tap-card>
        <div class="hero">
          <h2>Build for touch</h2>
          <p>One card, preview to full-screen detail</p>
        </div>
        ${copy}
      </tap-card>
      <tap-card>
        <div class="hero teal">
          <h2>Keep context</h2>
          <p>The current page remains underneath</p>
        </div>
        ${copy}
      </tap-card>
    </tap-page>
  `;
}
