import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  effect,
  emitter,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { locale } from '../lib/locale';
import { DuoyunScrollBaseElement } from './base/scroll';

import './action-text';

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .slot {
    text-align: left;
    overflow: hidden;
  }
  .overflow {
    margin-block-end: 0.5em;
  }
  .action {
    cursor: pointer;
  }
`;

@customElement('dy-more')
@adoptedStyle(style)
@aria({ role: 'combobox' })
@shadow()
export class DuoyunMoreElement extends GemElement {
  @slot static unnamed: string;

  @attribute maxheight: string;
  @attribute more: string;
  @attribute less: string;
  @boolattribute expandless: boolean;

  #state = createState({
    bottomOverflow: false,
    expanded: false,
  });

  #onClick = () => {
    this.#state({ expanded: !this.#state.expanded });
  };

  @effect()
  #updateAria = () => {
    this.internals.ariaExpanded = String(this.#state.expanded);
  };

  render = () => {
    const { expanded, bottomOverflow } = this.#state;
    return html`
      <dy-more-slot
        class=${classMap({ slot: true, overflow: bottomOverflow })}
        style=${styleMap({
          maxHeight: expanded ? 'none' : this.maxheight || '3.8lh',
        })}
        @change=${({ detail }: CustomEvent<boolean>) => this.#state({ bottomOverflow: detail })}
      >
        <slot></slot>
      </dy-more-slot>
      <dy-action-text
        v-if=${!this.expandless && (bottomOverflow || expanded)}
        class="action"
        @keydown=${commonHandle}
        @click=${this.#onClick}
      >
        ${expanded ? this.less || locale.less : this.more || locale.more}
      </dy-action-text>
    `;
  };
}

@customElement('dy-more-slot')
@aria({ role: 'paragraph' })
export class DuoyunMoreSlotElement extends DuoyunScrollBaseElement {
  @emitter change: Emitter<boolean>;

  @effect()
  #emitterEvent = () => this.change(this.bottomOverflow);
}
