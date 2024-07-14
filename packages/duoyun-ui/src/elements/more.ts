import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  boolattribute,
  slot,
  aria,
  shadow,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { classMap, createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';
import { commonHandle } from '../lib/hotkeys';

import { DuoyunScrollBaseElement } from './base/scroll';

import './action-text';

const style = createCSSSheet(css`
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
`);

type State = {
  bottomOverflow: boolean;
  expanded: boolean;
};

/**
 * @customElement dy-more
 * @attr maxheight
 * @attr expandless
 */
@customElement('dy-more')
@adoptedStyle(style)
@aria({ role: 'combobox' })
@shadow()
export class DuoyunMoreElement extends GemElement<State> {
  @slot static unnamed: string;

  @attribute maxheight: string;
  @attribute more: string;
  @attribute less: string;
  @boolattribute expandless: boolean;

  state: State = {
    bottomOverflow: false,
    expanded: false,
  };

  constructor() {
    super();
    this.effect(() => {
      this.internals.ariaExpanded = String(this.state.expanded);
    });
  }

  #onClick = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  render = () => {
    const { expanded, bottomOverflow } = this.state;
    return html`
      <dy-more-slot
        class=${classMap({ slot: true, overflow: bottomOverflow })}
        style=${styleMap({
          maxHeight: expanded ? 'none' : this.maxheight || '3.8lh',
        })}
        @change=${({ detail }: CustomEvent<boolean>) => this.setState({ bottomOverflow: detail })}
      >
        <slot></slot>
      </dy-more-slot>
      ${!this.expandless && (bottomOverflow || expanded)
        ? html`
            <dy-action-text class="action" @keydown=${commonHandle} @click=${this.#onClick}>
              ${expanded ? this.less || locale.less : this.more || locale.more}
            </dy-action-text>
          `
        : ''}
    `;
  };
}

/**
 * @customElement dy-more-slot
 */
@customElement('dy-more-slot')
@aria({ role: 'paragraph' })
export class DuoyunMoreSlotElement extends DuoyunScrollBaseElement {
  @emitter change: Emitter<boolean>;

  mounted = () => {
    this.effect(() => {
      this.change(this.bottomOverflow);
    });
  };
}
