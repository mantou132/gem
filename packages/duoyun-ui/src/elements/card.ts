// https://spectrum.adobe.com/page/cards/
import { adoptedStyle, customElement, attribute, property, part, slot, shadow, aria } from '@mantou/gem/lib/decorators';
import { createCSSSheet, html } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import type { StringList } from '../lib/types';

import { DuoyunLoadableBaseElement } from './base/loadable';
import type { ContextMenuItem } from './contextmenu';
import { ContextMenu } from './contextmenu';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
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
    align-self: center;
  }
  .actions:where(:hover, :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
  }
  slot[name='body']::slotted(*),
  slot:not([name])::slotted(*) {
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

export type ActionItem = Omit<ContextMenuItem, 'handle'> & { handle: (rest: HTMLElement) => void | Promise<void> };

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
@shadow({ delegatesFocus: true })
@aria({ role: 'group' })
export class DuoyunCardElement extends DuoyunLoadableBaseElement {
  @part static preview: string;
  @part static avatar: string;

  @slot static header: string;
  @slot static detail: string;
  @slot static detailRight: string;
  @slot static body: string;
  @slot static unnamed: string;
  @slot static footer: string;

  @attribute avatar: string;
  @attribute preview: string;

  @attribute header: StringList<'slot'>;
  @attribute detail: string;
  @attribute detailRight: string;
  @property actions?: ActionItem[];
  @attribute crossorigin: 'anonymous' | 'use-credentials';

  #onOpenMenu = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement;
    ContextMenu.open(
      this.actions!.map((e) => ({ ...e, handle: () => e.handle(target) })),
      { activeElement: target },
    );
  };

  render = () => {
    return html`
      ${this.preview
        ? html`<img
            part=${DuoyunCardElement.preview}
            alt="preview"
            class="preview"
            src=${this.preview}
            crossorigin=${this.crossorigin}
          />`
        : ''}
      ${this.avatar
        ? html`<img
            part=${DuoyunCardElement.avatar}
            alt="avatar"
            class="avatar"
            src=${this.avatar}
            crossorigin=${this.crossorigin}
          />`
        : ''}
      ${this.header
        ? html`
            <div class="header">
              <div class="title"><slot name=${DuoyunCardElement.header}>${this.header}</slot></div>
              <div class="detail"><slot name=${DuoyunCardElement.detail}>${this.detail}</slot></div>
              <div class="detail right"><slot name=${DuoyunCardElement.detailRight}>${this.detailRight}</slot></div>
              ${this.actions
                ? html`
                    <dy-use
                      tabindex="0"
                      role="button"
                      class="actions"
                      @click=${this.#onOpenMenu}
                      @keydown=${commonHandle}
                      .element=${icons.more}
                    ></dy-use>
                  `
                : ''}
            </div>
          `
        : ''}
      <slot name=${DuoyunCardElement.body}></slot>
      <slot></slot>
      <slot name=${DuoyunCardElement.footer}></slot>
    `;
  };
}
