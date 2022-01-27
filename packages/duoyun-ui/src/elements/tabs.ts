import { adoptedStyle, customElement, emitter, Emitter, property, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, partMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { DuoyunScrollBaseElement } from './base/scroll';

import '@mantou/gem/elements/use';
import './compartment';
import './divider';

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
  }
  [part~='tabs'] {
    display: flex;
    font-size: 0.875em;
    gap: 2em;
    flex-shrink: 0;
  }
  .divider {
    flex-shrink: 0;
  }
  :host([center]) [part~='tabs'] {
    justify-content: center;
  }
  [part~='tab'] {
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    line-height: 1.5;
    padding: 0.8em 0;
    gap: 0.3em;
  }
  [part~='icon'] {
    width: 1.2em;
  }
  [part~='tab']:hover,
  [part~='current'] {
    color: ${theme.primaryColor};
  }
  [part~='mark'] {
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
      <div part="tabs">
        ${this.data.map(({ value, tab, icon, getContent }, index) => {
          const isCurrent = (value ?? index) === this.value;
          if (isCurrent) currentContent = getContent?.() || '';
          return html`
            <div
              role="tab"
              part=${partMap({ tab: true, current: isCurrent })}
              @click=${() => this.change(value ?? index)}
            >
              ${icon ? html`<gem-use part="icon" .element=${icon}></gem-use>` : ''}${tab}
              ${isCurrent ? html`<dy-divider part="mark" size="medium" .color=${theme.primaryColor}></dy-divider>` : ''}
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
