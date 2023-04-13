import { adoptedStyle, customElement, attribute, emitter, Emitter, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';
import { commonHandle } from '../lib/hotkeys';

import { DuoyunScrollBaseElement } from './base/scroll';

import './action-text';

const style = createCSSSheet(css`
  :host {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .slot {
    text-align: left;
    overflow: hidden;
  }
  .slot::-webkit-scrollbar {
    width: 0;
  }
  .action {
    cursor: pointer;
    padding-block: 0.25em;
    align-self: flex-start;
  }
  .action.absolute {
    position: absolute;
    bottom: -0.5em;
    left: 0;
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
export class DuoyunMoreElement extends GemElement<State> {
  @attribute maxheight: string;
  @boolattribute expandless: boolean;

  state: State = {
    bottomOverflow: false,
    expanded: false,
  };

  constructor() {
    super();
    this.internals.role = 'combobox';
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
        class="slot"
        style=${styleMap({
          marginBlockEnd: !bottomOverflow ? 'auto' : '1.2em',
          maxHeight: expanded ? 'auto' : this.maxheight || '6em',
        })}
        @change=${({ detail }: CustomEvent<boolean>) => this.setState({ bottomOverflow: detail })}
      >
        <slot></slot>
      </dy-more-slot>
      ${!this.expandless && (bottomOverflow || expanded)
        ? html`
            <dy-action-text
              class=${classMap({ action: true, absolute: !expanded })}
              @keydown=${commonHandle}
              @click=${this.#onClick}
            >
              ${expanded ? locale.less : locale.more}
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
export class DuoyunMoreSlotElement extends DuoyunScrollBaseElement {
  @emitter change: Emitter<boolean>;

  constructor() {
    super();
    this.internals.role = 'paragraph';
  }

  mounted = () => {
    this.effect(() => {
      this.change(this.bottomOverflow);
    });
  };

  render = () => {
    return html`<slot></slot>`;
  };
}
