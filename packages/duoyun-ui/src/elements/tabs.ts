import {
  adoptedStyle,
  customElement,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, partMap, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { DuoyunScrollBaseElement } from './base/scroll';

import './use';
import './compartment';
import './divider';

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
  }
  .tabs {
    display: flex;
    font-size: 0.875em;
    gap: 2em;
    flex-shrink: 0;
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
  .icon {
    width: 1.2em;
  }
  .tab:hover,
  .current {
    color: ${theme.primaryColor};
  }
  .marker {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    transform: translateY(100%);
  }
`);
export interface TabItem<T = any> {
  tab: string;
  value?: T;
  icon?: string | Element | DocumentFragment;
  getContent?: () => string | TemplateResult;
}

/**
 * @customElement dy-tabs
 */
@customElement('dy-tabs')
@adoptedStyle(style)
export class DuoyunTabsElement extends GemElement {
  @part static tabs: string;
  @part static tab: string;
  @part static currentTab: string;
  @part static icon: string;
  @part static marker: string;

  @boolattribute center: boolean;
  @property data?: TabItem[];
  @property value?: any;
  @emitter change: Emitter<any>;

  constructor() {
    super();
    this.internals.role = 'tablist';
  }

  render = () => {
    if (!this.data) return html``;
    let currentContent: TemplateResult | string = '';
    return html`
      <div part=${DuoyunTabsElement.tabs} class="tabs">
        ${this.data.map(({ value, tab, icon, getContent }, index) => {
          const isCurrent = (value ?? index) === this.value;
          if (isCurrent) currentContent = getContent?.() || '';
          return html`
            <div
              role="tab"
              class=${classMap({ tab: true, current: isCurrent })}
              part=${partMap({ [DuoyunTabsElement.tab]: true, [DuoyunTabsElement.currentTab]: isCurrent })}
              @click=${() => this.change(value ?? index)}
            >
              ${icon ? html`<dy-use part=${DuoyunTabsElement.icon} class="icon" .element=${icon}></dy-use>` : ''}${tab}
              ${isCurrent
                ? html`
                    <dy-divider
                      part=${DuoyunTabsElement.marker}
                      class="marker"
                      size="medium"
                      .color=${theme.primaryColor}
                    ></dy-divider>
                  `
                : ''}
            </div>
          `;
        })}
      </div>
      <dy-divider class="divider" size="medium"></dy-divider>
      <dy-compartment .content=${currentContent}></dy-compartment>
    `;
  };
}

const panelStyle = createCSSSheet(css`
  :host {
    display: block;
    flex-shrink: 1;
    flex-grow: 1;
    line-height: 1.5;
    margin-block-start: 1em;
  }
`);

/**
 * @customElement dy-tab-panel
 */
@customElement('dy-tab-panel')
@adoptedStyle(panelStyle)
export class DyTabPanelElement extends DuoyunScrollBaseElement {
  constructor() {
    super();
    this.internals.role = 'tabpanel';
  }
}
