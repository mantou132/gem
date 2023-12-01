import { adoptedStyle, customElement, attribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme, getSemanticColor } from '../lib/theme';
import { StringList } from '../lib/types';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    align-items: center;
    gap: 0.6em;
  }
  .light {
    width: 0.5em;
    height: 0.5em;
    border-radius: 1em;
    background-color: currentColor;
    flex-shrink: 0;
  }
  slot {
    display: inline;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`);

export type Status = StringList<'default' | 'positive' | 'informative' | 'neutral' | 'notice' | 'negative'>;

export function getStatusColor(status: Status) {
  const semanticColor = getSemanticColor(status);
  if (semanticColor) return semanticColor;
  switch (status) {
    case 'default':
      return theme.neutralColor;
    default:
      return status;
  }
}

/**
 * @customElement dy-status-light
 */
@customElement('dy-status-light')
@adoptedStyle(style)
export class DuoyunStatusLightElement extends GemElement {
  @attribute status: Status;

  constructor() {
    super();
    this.internals.role = 'status';
  }

  get #status() {
    return this.status || 'default';
  }

  render = () => {
    return html`
      <style>
        .light {
          color: ${getStatusColor(this.#status)};
        }
      </style>
      <div class="light"></div>
      <slot></slot>
    `;
  };
}
