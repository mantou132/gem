import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';
import { theme } from '@mantou/tap-ui/lib/theme';

const style = css`
  .intro {
    margin-block-end: 1em;
    color: ${theme.textColor};
    p:first-of-type {
      margin-block-start: 0;
    }
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }
  .card-copy {
    line-height: 1.65;
    p:first-of-type {
      margin-block-start: 0;
    }
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
  <tap-content slot="expandable" class="card-copy">
    <p>Expandable cards keep the preview and detail content in one DOM tree. The card is clipped while closed and becomes its own scroll container after opening.</p>
    <p>Pull down from the top of the detail to dismiss it. The page header and bottom tab bar move out of the way through a shared store, so the card can use the complete viewport.</p>
    <p>Long content stays mounted throughout the transition. Only transforms and opacity are animated, which prevents text from reflowing during the opening animation.</p>
    <p>${'This is additional detail content for scrolling. '.repeat(12)}</p>
  </tap-content>
`;

@customElement('t-cards')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TCardsElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Cards"></tap-navbar>
      <tap-content>
        <div class="intro">
          <p>Android-style expandable cards inspired by Framework7.</p>
          <p class="close-hint">Tap a card, then scroll and pull down at the top to close.</p>
        </div>
        <div class="cards">
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
        </div>
      </tap-content>
    </tap-page>
  `;
}
