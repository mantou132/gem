import {
  adoptedStyle,
  customElement,
  attribute,
  part,
  slot,
  numattribute,
  property,
  boolattribute,
  state,
  shadow,
  mounted,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, createRef, GemElement, html } from '@mantou/gem/lib/element';
import { classMap, css } from '@mantou/gem/lib/utils';

import { contentsContainer } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';
import { StringList } from '../lib/types';

import './use';

const style = createCSSSheet(css`
  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
    white-space: nowrap;
    box-shadow: 0px 0px 0px 2px;
    border-radius: 100em;
    color: ${theme.backgroundColor};
    height: 1.5em;
    min-width: 1.5em;
  }
  .long {
    padding-inline: 0.5em;
  }
  :host([small]) .badge {
    font-size: 0.56em;
  }
  :host([dot]) .badge {
    height: 0.5em;
    min-width: 0.5em;
  }
  .icon {
    width: 1em;
  }
  @supports (anchor-name: --foo) {
    :host(:where(:state(inline):not([hidden]))) {
      display: inline;
      anchor-name: --anchor;
    }
    ::slotted(*) {
      anchor-name: --anchor;
    }
    :host(:not(:empty)) .badge {
      position: absolute;
      transform: translate(50%, -50%);
      position-anchor: --anchor;
      top: anchor(top);
      right: anchor(right);
    }
  }
  @supports not (anchor-name: --foo) {
    :host(:not([hidden])) {
      display: inline;
      position: relative;
    }
    :host(:not(:empty)) .badge {
      position: absolute;
      transform: translate(50%, -50%);
      top: 0;
      right: 0;
    }
  }
`);

/**
 * @customElement dy-badge
 */
@customElement('dy-badge')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
@shadow()
export class DuoyunBadgeElement extends GemElement {
  @slot static unnamed: string;

  @part static badge: string;

  @attribute color: StringList<'positive' | 'informative' | 'notice'>;
  /**Support number and string */
  @attribute count: string;
  @boolattribute dot: boolean;
  @boolattribute small: boolean;
  @numattribute max: number;

  @state inline: boolean;

  @property icon?: string | Element | DocumentFragment;

  #slotRef = createRef<HTMLSlotElement>();

  get #max() {
    return this.max || 99;
  }

  get #color() {
    return getSemanticColor(this.color) || this.color || theme.negativeColor;
  }

  #onSlotChange = () => {
    this.inline = !this.#slotRef.element!.assignedElements({ flatten: true }).length;
  };

  @mounted()
  #init = () => {
    this.inline = !this.childNodes.length;
    this.#slotRef.element?.addEventListener('slotchange', this.#onSlotChange);
  };

  render = () => {
    const value = Number(this.count) > this.#max ? `${this.#max}+` : `${this.count}`;
    return html`
      <slot ref=${this.#slotRef.ref}></slot>
      ${this.count || this.icon || this.dot
        ? html`
            <span
              class=${classMap({ badge: true, long: value.length > 1 })}
              part=${DuoyunBadgeElement.badge}
              style="background:${this.#color}"
            >
              ${this.dot ? '' : this.icon ? html`<dy-use class="icon" .element=${this.icon}></dy-use>` : value}
            </span>
          `
        : ''}
    `;
  };
}
