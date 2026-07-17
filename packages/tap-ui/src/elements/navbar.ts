import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  emitter,
  part,
  shadow,
  slot,
  template,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';

import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    display: grid;
    grid-template-columns: 2.5em 1fr 2.5em;
    grid-template-rows: 2.5em;
    align-items: center;
    flex-shrink: 0;
    gap: 0.25em;
    padding-inline: 0.25em;
    padding-block: 0.5em;
    padding-block-start: calc(0.5em + env(safe-area-inset-top, 0px));
    box-sizing: border-box;
    background: ${theme.backgroundColor};
    border-block-end: 1px solid ${theme.borderColor};
    color: ${theme.highlightColor};
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition:
      background 150ms ${theme.timingFunction},
      border-color 150ms ${theme.timingFunction};
  }
  :host([transparent]) {
    background: transparent;
    border-block-end-color: transparent;
  }
  .back {
    grid-column: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5em;
    height: 2.5em;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: ${theme.normalRound};
    background: transparent;
    color: ${theme.primaryColor};
    cursor: pointer;
  }
  .title {
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-size: 1.0625em;
    font-weight: 600;
    line-height: 1.3;
    transition: opacity 150ms ${theme.timingFunction};
  }
  :host([transparent]) .title {
    opacity: 0;
  }
  .right {
    grid-column: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    height: 100%;
  }
`;

@customElement('tap-navbar')
@shadow()
@adoptedStyle(style)
@aria({ role: 'banner' })
export class TapNavbarElement extends GemElement {
  @part static title: string;
  @slot @part static right: string;

  @attribute title: string;
  @boolattribute back: boolean;
  /**Set by `<tap-page floatheader>` while content is not scrolled */
  @boolattribute transparent: boolean;
  @emitter backclick: Emitter<null>;

  @template()
  #content = () => {
    return html`
      <button v-if=${this.back} type="button" class="back" aria-label="back" @click=${() => this.backclick(null)}>
        <tap-use class="icon" .element=${icons.back}></tap-use>
      </button>
      <div class="title" part=${TapNavbarElement.title}>${this.title}</div>
      <div class="right" part=${TapNavbarElement.right}>
        <slot name=${TapNavbarElement.right}></slot>
      </div>
    `;
  };
}
