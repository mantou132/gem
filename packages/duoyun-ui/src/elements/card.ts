// https://spectrum.adobe.com/page/cards/
import { adoptedStyle, customElement, attribute, property } from '@mantou/gem/lib/decorators';
import { html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { DuoyunLoadableBaseElement } from './base/loadable';
import { MenuItem, ContextMenu } from './menu';

import '@mantou/gem/elements/use';

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
    padding: 1em;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
  }
  .preview {
    display: block;
    margin: -1em -1em 1em;
    aspect-ratio: 2 / 1;
    background: ${theme.hoverBackgroundColor};
    width: calc(100% + 2em);
    object-fit: cover;
  }
  .avatar {
    display: block;
    width: 4em;
    height: 4em;
    border: 2px solid ${theme.backgroundColor};
    background: ${theme.describeColor};
    border-radius: 4em;
    margin-block: -4em 1em;
    object-fit: cover;
  }
  .header {
    display: flex;
    gap: 0.2em;
    align-items: baseline;
    margin-block-end: 1em;
  }
  .title {
    font-size: 1.125em;
    font-weight: bold;
    color: ${theme.highlightColor};
  }
  .detail {
    flex-grow: 1;
    font-size: 0.875em;
    color: ${theme.describeColor};
  }
  .detail:not(.right) {
    text-transform: uppercase;
  }
  .right {
    flex-grow: 0;
    white-space: nowrap;
  }
  .actions {
    width: 1.5em;
    padding: 0.1em;
    border-radius: ${theme.normalRound};
  }
  .actions:where(:hover, :--active, [data-active]) {
    background-color: ${theme.hoverBackgroundColor};
  }
  slot[name='body']::slotted(*) {
    hyphens: auto;
    margin-block-end: 0em !important;
  }
  slot[name='footer']::slotted(*) {
    margin-block-start: 1em;
    padding-block-start: 1em;
    border-block-start: 1px solid ${theme.borderColor};
    border-radius: 0;
    display: flex;
    justify-content: flex-end;
    gap: 1em;
  }
`);

export type ActionItem = Omit<MenuItem, 'handle'> & { handle: (rest: HTMLElement) => void | Promise<void> };

/**
 * @customElement dy-card
 * @attr header
 * @attr detail
 * @attr avatar
 * @attr preview
 */
@customElement('dy-card')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunCardElement extends DuoyunLoadableBaseElement {
  @attribute avatar: string;
  @attribute preview: string;

  @property header?: string | TemplateResult;
  @property detail?: string | TemplateResult;
  @property detailRight?: string | TemplateResult;
  @property actions?: ActionItem[];

  constructor() {
    super();
    this.internals.role = 'group';
  }

  #onOpenMenu = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement;
    ContextMenu.open(
      this.actions!.map((e) => ({ ...e, handle: () => e.handle(target) })),
      { activeElement: target },
    );
  };

  render = () => {
    return html`
      ${this.preview ? html`<img part="preview" alt="preview" class="preview" src=${this.preview}></img>` : ''}
      ${this.avatar ? html`<img part="avatar" alt="avatar" class="avatar" src=${this.avatar}></img>` : ''}
      ${this.header
        ? html`
            <div class="header">
              <div class="title">${this.header}</div>
              <div class="detail">${this.detail}</div>
              <div class="detail right">${this.detailRight}</div>
              ${this.actions
                ? html`
                    <gem-use
                      tabindex="0"
                      role="button"
                      class="actions"
                      @click=${this.#onOpenMenu}
                      @keydown=${commonHandle}
                      .element=${icons.more}
                    ></gem-use>
                  `
                : ''}
            </div>
          `
        : ''}
      <slot name="body"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    `;
  };
}