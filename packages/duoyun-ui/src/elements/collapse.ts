// https://ant.design/components/collapse/
// https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden#the_hidden_until_found_state

import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  attribute,
  part,
  boolattribute,
  property,
  emitter,
  slot,
  shadow,
  aria,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, GemElement, html, createState, createRef, nothing } from '@mantou/gem/lib/element';
import { css, classMap, exportPartsMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { commonAnimationOptions } from '../lib/animations';

import './use';

const panelStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    border-block-start: 1px solid ${theme.borderColor};
  }
  .summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 1em;
    background: ${theme.lightBackgroundColor};
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon {
    width: 1.2em;
    flex-shrink: 0;
    transition: transform 0.3s;
  }
  .icon.expand {
    transform: rotate(90deg);
  }
  .detail {
    height: 0;
    padding: 0 1em;
    border-block-start: 0px solid ${theme.borderColor};
    overflow: hidden;
    box-sizing: border-box;
    line-height: 1.5;
  }
  .detail.expand {
    height: auto;
    padding-block: 1em;
    border-width: 1px;
  }
`);

/**
 * @customElement dy-collapse-panel
 */
@customElement('dy-collapse-panel')
@adoptedStyle(panelStyle)
@adoptedStyle(focusStyle)
@aria({ role: 'listitem' })
@shadow()
export class DuoyunCollapsePanelElement extends GemElement {
  @slot static unnamed: string;
  @part @slot static summary: string;
  @part static detail: string;

  @boolattribute searchable: boolean;

  @attribute summary: string;

  @emitter toggle: Emitter<boolean>;

  #contentRef = createRef<HTMLDivElement>();

  #animate = async (isCollapse: boolean) => {
    const { element } = this.#contentRef;
    if (!element) return;
    const { height } = element.getBoundingClientRect();
    const frames = [{ height: 0, paddingBlock: 0, borderWidth: 0 }, { height: `${height}px` }];
    if (isCollapse) frames.reverse();
    return element.animate(frames, commonAnimationOptions).finished;
  };

  render = () => {
    const { expand, preExpand } = this.state;

    return html`
      <div
        class="summary"
        part=${DuoyunCollapsePanelElement.summary}
        tabindex="0"
        @keydown=${commonHandle}
        @click=${this.toggleState}
      >
        <dy-use class=${classMap({ icon: true, expand: preExpand })} .element=${icons.right}></dy-use>
        <span class="title"><slot name=${DuoyunCollapsePanelElement.summary}>${this.summary}</slot></span>
      </div>
      ${expand || this.searchable
        ? html`
            <div
              class=${classMap({ detail: true, expand })}
              ref=${this.#contentRef.ref}
              part=${DuoyunCollapsePanelElement.detail}
              hidden=${expand ? nothing : 'until-found'}
              @beforematch=${this.toggleState}
            >
              <slot></slot>
            </div>
          `
        : ''}
    `;
  };

  state = createState({
    preExpand: false,
    expand: false,
  });

  toggleState = async () => {
    const { expand, preExpand } = this.state;
    this.toggle(!preExpand);
    this.state({ preExpand: !preExpand });
    if (expand) await this.#animate(true);
    this.state({ expand: !expand });
    if (!expand) queueMicrotask(() => this.#animate(false));
  };
}

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    overflow: hidden;
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
    overflow-anchor: none;
  }
  :host dy-collapse-panel:first-child {
    border-block-start: none;
  }
`);

type CollapseItem = {
  summary: string | TemplateResult;
  detail: string | TemplateResult;
};

/**
 * @customElement dy-collapse
 */
@customElement('dy-collapse')
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
@aria({ role: 'list' })
export class DuoyunCollapseElement extends GemElement {
  @part static panel: string;
  @part static summary: string;
  @part static detail: string;
  @attribute type: 'single' | 'multi';
  @boolattribute searchable: boolean;

  @property items?: CollapseItem[];

  get #type() {
    return this.type || 'multi';
  }

  #onToggle = (evt: CustomEvent<boolean>) => {
    if (this.#type === 'single' && evt.detail) {
      [...this.shadowRoot!.querySelectorAll('dy-collapse-panel')].forEach((panel: DuoyunCollapsePanelElement) => {
        if (panel !== evt.target && panel.state.preExpand) {
          panel.toggleState();
        }
      });
    }
  };

  #parts = exportPartsMap({
    [DuoyunCollapsePanelElement.summary]: DuoyunCollapseElement.summary,
    [DuoyunCollapsePanelElement.detail]: DuoyunCollapseElement.detail,
  });

  render() {
    return html`${this.items?.map(
      ({ summary, detail }) => html`
        <dy-collapse-panel
          part=${DuoyunCollapseElement.panel}
          exportparts=${this.#parts}
          .searchable=${this.searchable}
          .summary=${summary}
          @toggle=${this.#onToggle}
        >
          ${detail}
        </dy-collapse-panel>
      `,
    )}`;
  }
}
