import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { createRef, GemElement, html } from '@mantou/gem/lib/element';
import { Callout, type CalloutItem } from '@mantou/tap-ui/elements/callout';
import { Toast } from '@mantou/tap-ui/elements/toast';
import { longPress } from '@mantou/tap-ui/lib/directives';
import { icons } from '@mantou/tap-ui/lib/icons';
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
  .bubble {
    padding: 0.75em 1em;
    border-radius: 1em;
    color: #fff;
    background: ${theme.primaryColor};
  }
  .callouts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1em;
    margin-block-start: 2em;
    .preview-trigger {
      align-self: flex-end;
    }
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

const calloutMenu: CalloutItem[] = [
  { label: 'Copy', icon: icons.copy, handle: () => Toast.open('success', 'Copied') },
  { label: 'Favorite', icon: icons.star, handle: () => Toast.open('success', 'Favorited') },
  { label: 'Delete', icon: icons.delete, danger: true, handle: () => Toast.open('success', 'Deleted') },
];

const messagePreviewStyle = css`
  :scope {
    display: block;
    width: 18em;
    color: ${theme.textColor};
  }
  .cover {
    display: flex;
    align-items: flex-end;
    aspect-ratio: 16 / 9;
    padding: 1em 1.25em;
    box-sizing: border-box;
    color: #fff;
    font-size: 1.25em;
    font-weight: 600;
    background: linear-gradient(145deg, #536dfe, #7c4dff);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.75em;
    padding: 1em 1.25em 0;
  }
  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25em;
    height: 2.25em;
    border-radius: 50%;
    color: #fff;
    font-weight: 600;
    background: ${theme.primaryColor};
  }
  .name {
    flex: 1;
    font-weight: 600;
    color: ${theme.highlightColor};
  }
  .time {
    font-size: 0.75em;
    color: ${theme.describeColor};
  }
  .text {
    margin: 0;
    padding: 0.75em 1.25em 1.25em;
    line-height: 1.6;
  }
`;

@customElement('t-message-preview')
@adoptedStyle(messagePreviewStyle)
export class TMessagePreviewElement extends GemElement {
  @template()
  #render = () => html`
    <div class="cover">Weekend trip</div>
    <div class="meta">
      <span class="avatar">A</span>
      <span class="name">Alice</span>
      <span class="time">10:24</span>
    </div>
    <p class="text">The preview opens from the pressed message, so you can read the whole thing before picking an action.</p>
  `;
}

@customElement('t-cards')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TCardsElement extends GemElement {
  #previewTriggerRef = createRef<HTMLElement>();

  #onRefresh = ({ detail: done }: CustomEvent<() => void>) => {
    setTimeout(done, 1000);
  };

  @template()
  #render = () => html`
    <tap-page refreshable @refresh=${this.#onRefresh}>
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
        <div class="callouts">
          <p class="close-hint">Long press the bubbles below.</p>
          <tap-callout .menu=${calloutMenu}>
            <div class="bubble">Lift in place</div>
          </tap-callout>
          <div
            class="bubble preview-trigger"
            ${this.#previewTriggerRef}
            ${longPress(() =>
              Callout.open({
                target: this.#previewTriggerRef.value!,
                menu: calloutMenu,
                preview: html`<t-message-preview></t-message-preview>`,
              }),
            )}
          >
            Show a preview
          </div>
        </div>
      </tap-content>
    </tap-page>
  `;
}
