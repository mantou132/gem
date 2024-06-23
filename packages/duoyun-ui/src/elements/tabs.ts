import {
  adoptedStyle,
  customElement,
  emitter,
  Emitter,
  property,
  boolattribute,
  attribute,
  part,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, partMap, classMap, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { closestElement } from '../lib/element';

import { DuoyunScrollBaseElement } from './base/scroll';

import './use';
import './compartment';
import './divider';

const getAnchorName = (index: number) => `--anchor-${index}`;

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
  }
  :host([orientation='vertical']) {
    flex-direction: row;
  }
  .tabs {
    position: relative;
    display: flex;
    font-size: 0.875em;
    gap: 2em;
    flex-shrink: 0;
    max-width: 100%;
  }
  :host([orientation='vertical']) .tabs {
    flex-direction: column;
    gap: 0;
  }
  .divider {
    flex-shrink: 0;
  }
  :host([center]) .tabs {
    justify-content: center;
  }
  .tab {
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    line-height: 1.5;
    padding: 0.8em 0;
    gap: 0.3em;
    color: ${theme.describeColor};
  }
  :host([orientation='vertical']) .tab {
    padding-inline-end: 1em;
  }
  .icon {
    width: 1.2em;
  }
  .tab:hover,
  .current,
  .marker,
  .animate-marker {
    color: ${theme.primaryColor};
  }
  .marker {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
  }
  :host([orientation='vertical']) .marker {
    top: 0;
    left: 100%;
    height: 100%;
  }
  .animate-marker {
    display: none;
  }
  @supports (anchor-name: --foo) {
    .marker {
      background: none;
    }
    .animate-marker {
      display: block;
      position: absolute;
      inset: anchor(bottom) anchor(right) auto anchor(left);
      transition: inset 0.3s ${theme.timingFunction};
    }
    :host([orientation='vertical']) .animate-marker {
      inset: anchor(top) auto anchor(bottom) anchor(right);
    }
  }
`);

export interface TabItem<T = any> {
  label: string | TemplateResult;
  value?: T;
  icon?: string | Element | DocumentFragment;
  getContent?: () => string | TemplateResult;
}

/**
 * @customElement dy-tabs
 */
@customElement('dy-tabs')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunTabsElement extends GemElement {
  @part static tabs: string;
  @part static tab: string;
  @part static current: string;
  @part static icon: string;
  @part static marker: string;
  @part static divider: string;

  @boolattribute center: boolean;
  @attribute orientation: 'horizontal' | 'vertical';

  @property items?: TabItem[];
  @property value?: any;
  @emitter change: Emitter<any>;

  get #orientation() {
    return this.orientation || 'horizontal';
  }

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'tablist';
  }

  render = () => {
    if (!this.items) return html``;
    let currentContent: TemplateResult | string = '';
    const currentIndex = this.items.findIndex(({ value }, index) => (value ?? index) === this.value);
    return html`
      <div part=${DuoyunTabsElement.tabs} class="tabs">
        ${currentIndex !== -1
          ? html`
              <dy-divider
                part=${DuoyunTabsElement.marker}
                class="animate-marker"
                size="medium"
                orientation=${this.#orientation}
                style=${styleMap({ positionAnchor: getAnchorName(currentIndex) })}
              ></dy-divider>
            `
          : ''}
        ${this.items.map(({ value, label, icon, getContent }, index) => {
          const isCurrent = currentIndex === index;
          if (isCurrent) currentContent = getContent?.() || '';
          return html`
            <div
              role="tab"
              style=${styleMap({ anchorName: getAnchorName(index) })}
              class=${classMap({ tab: true, current: isCurrent })}
              part=${partMap({ [DuoyunTabsElement.tab]: true, [DuoyunTabsElement.current]: isCurrent })}
              @click=${() => this.change(value ?? index)}
            >
              ${icon ? html`<dy-use part=${DuoyunTabsElement.icon} class="icon" .element=${icon}></dy-use>` : ''}
              <span tabindex="0" @keydown=${commonHandle}>${label}</span>
              ${isCurrent
                ? html`
                    <dy-divider
                      part=${DuoyunTabsElement.marker}
                      class="marker"
                      size="medium"
                      orientation=${this.#orientation}
                    ></dy-divider>
                  `
                : ''}
            </div>
          `;
        })}
      </div>
      <dy-divider
        part=${DuoyunTabsElement.divider}
        class="divider"
        size="medium"
        orientation=${this.#orientation}
      ></dy-divider>
      <dy-compartment
        .content=${html`
          <style>
            dy-tab-panel::-webkit-scrollbar {
              width: 0;
            }
          </style>
          ${currentContent}
        `}
      ></dy-compartment>
    `;
  };
}

const panelStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    flex-shrink: 1;
    flex-grow: 1;
    line-height: 1.5;
    margin-block-start: 1em;
  }
  :host(:state(vertical)) {
    margin-inline-start: 1em;
    margin-block-start: 0em;
  }
`);

/**
 * @customElement dy-tab-panel
 */
@customElement('dy-tab-panel')
@adoptedStyle(panelStyle)
export class DuoyunTabPanelElement extends DuoyunScrollBaseElement {
  @state vertical: boolean;

  constructor() {
    super();
    this.internals.role = 'tabpanel';
    this.addEventListener('change', (e) => e.stopPropagation());
    this.effect(() => {
      this.vertical = closestElement(this, DuoyunTabsElement)?.orientation === 'vertical';
    });
  }
}
