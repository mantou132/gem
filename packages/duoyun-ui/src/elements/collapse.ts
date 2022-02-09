// https://ant.design/components/collapse/
import { adoptedStyle, customElement, attribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';

const panelStyle = createCSSSheet(css`
  :host {
    display: block;
    border-block-start: 1px solid ${theme.borderColor};
  }
  .header {
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
  }
  .expand {
    transform: rotate(90deg);
  }
  .content {
    padding: 1em;
    line-height: 1.5;
    border-block-start: 1px solid ${theme.borderColor};
  }
`);

type State = {
  expand: boolean;
};

/**
 * @customElement dy-collapse-panel
 */
@customElement('dy-collapse-panel')
@adoptedStyle(panelStyle)
@adoptedStyle(focusStyle)
export class DuoyunCollapsePanelElement extends GemElement<State> {
  @attribute header: string;

  constructor() {
    super();
    this.internals.role = 'listitem';
  }

  state: State = {
    expand: false,
  };

  render = () => {
    const { expand } = this.state;

    return html`
      <div
        class="header"
        part="header"
        tabindex="0"
        @keydown=${commonHandle}
        @click=${() => this.setState({ expand: !expand })}
      >
        <dy-use class=${classMap({ icon: true, expand: expand })} .element=${icons.right}></dy-use>
        <span class="title">${this.header}</span>
      </div>
      ${expand
        ? html`
            <div class="content" part="content">
              <slot></slot>
            </div>
          `
        : ''}
    `;
  };
}

const style = createCSSSheet(css`
  dy-collapse {
    display: block;
    overflow: hidden;
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
  }
  dy-collapse dy-collapse-panel:first-child {
    border-block-start: none;
  }
`);

/**
 * @customElement dy-collapse
 */
@customElement('dy-collapse')
@adoptedStyle(style)
export class DuoyunCollapseElement extends GemElement {
  constructor() {
    super({ isLight: true });
    this.internals.role = 'list';
  }
}
