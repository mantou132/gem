// https://ant.design/components/collapse/
// https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden#the_hidden_until_found_state

import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  emitter,
  light,
  part,
  property,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { commonAnimationOptions } from '../lib/animations';
import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

import './use';

const panelStyle = css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
  }
  :host(:not(:last-of-type))::after {
    content: '';
    position: absolute;
    inset-inline-start: 1em;
    inset-inline-end: 0;
    inset-block-end: 0;
    border-block-end: ${theme.hairline} solid ${theme.separatorColor};
    pointer-events: none;
  }
  .summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75em;
    min-height: 3.5em;
    padding: 0.75em 1em;
    box-sizing: border-box;
    font-size: 1.0625em;
    line-height: 1.4;
    color: ${theme.highlightColor};
  }
  .summary:active {
    background: ${theme.hoverBackgroundColor};
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon {
    order: 1;
    width: 1.25em;
    flex-shrink: 0;
    color: ${theme.describeColor};
    opacity: 0.55;
    transition: transform 0.3s;
  }
  .icon.expand {
    transform: rotate(90deg);
  }
  .detail {
    height: 0;
    padding: 0 1em;
    overflow: hidden;
    box-sizing: border-box;
    line-height: 1.5;
    color: ${theme.describeColor};
  }
  .detail.expand {
    height: auto;
    padding-block-end: 1em;
  }
`;

@customElement('tap-collapse-panel')
@adoptedStyle(panelStyle)
@adoptedStyle(focusStyle)
@aria({ role: 'listitem' })
@shadow()
export class TapCollapsePanelElement extends GemElement {
  @slot static unnamed: string;
  @part @slot static summary: string;
  @part static detail: string;

  @boolattribute searchable: boolean;

  @attribute summary: string;

  @emitter toggle: Emitter<boolean>;

  @state collapsePanel = true;

  #contentRef = createRef<HTMLDivElement>();

  #animate = async (isCollapse: boolean) => {
    const { value: element } = this.#contentRef;
    if (!element) return;
    const { height } = element.getBoundingClientRect();
    const frames = [{ height: 0, paddingBlock: 0 }, { height: `${height}px` }];
    if (isCollapse) frames.reverse();
    return element.animate(frames, commonAnimationOptions).finished;
  };

  render = () => {
    const { expand, preExpand } = this.state;

    return html`
      <div
        class="summary"
        part=${TapCollapsePanelElement.summary}
        tabindex="0"
        @keydown=${commonHandle}
        @click=${this.toggleState}
      >
        <tap-use class=${classMap({ icon: true, expand: preExpand })} .element=${icons.right}></tap-use>
        <span class="title"><slot name=${TapCollapsePanelElement.summary}>${this.summary}</slot></span>
      </div>
      <div
        ${this.#contentRef}
        v-if=${expand || this.searchable}
        class=${classMap({ detail: true, expand })}
        part=${TapCollapsePanelElement.detail}
        hidden=${expand ? null : 'until-found'}
        @beforematch=${this.toggleState}
      >
        <slot></slot>
      </div>
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

const style = css`
  :scope:where(:not([hidden])) {
    display: block;
    overflow: hidden;
    border-radius: calc(${theme.normalRound} * 3);
    background: ${theme.backgroundColor};
    color: ${theme.textColor};
    overflow-anchor: none;
  }
`;

type CollapseItem = {
  summary: string | TemplateResult;
  detail: string | TemplateResult;
};

@customElement('tap-collapse')
@adoptedStyle(style)
@aria({ role: 'list' })
@light({ penetrable: true })
export class TapCollapseElement extends GemElement {
  @attribute type: 'single' | 'multi';
  @boolattribute searchable: boolean;

  @property items?: CollapseItem[];

  get #type() {
    return this.type || 'multi';
  }

  #onToggle = (evt: CustomEvent<boolean>) => {
    if (this.#type === 'single' && evt.detail) {
      [...this.querySelectorAll(':state(collapse-panel)')].forEach((panel: TapCollapsePanelElement) => {
        if (panel !== evt.target && panel.state.preExpand) {
          panel.toggleState();
        }
      });
    }
  };

  render() {
    return html`${this.items?.map(
      ({ summary, detail }) => html`
        <tap-collapse-panel
          .searchable=${this.searchable}
          .summary=${summary}
          @toggle=${this.#onToggle}
        >
          ${detail}
        </tap-collapse-panel>
      `,
    )}`;
  }
}
