import { adoptedStyle, aria, attribute, customElement, shadow, slot } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { getSemanticColor, theme } from '../lib/theme';
import type { StringList } from '../lib/types';

const style = css`
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
`;

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

@customElement('dy-status-light')
@adoptedStyle(style)
@aria({ role: 'status' })
@shadow()
export class DuoyunStatusLightElement extends GemElement {
  @slot static unnamed: string;

  @attribute status: Status;

  get #status() {
    return this.status || 'default';
  }

  render = () => {
    return html`
      <div class="light" style="color:${getStatusColor(this.#status)}"></div>
      <slot></slot>
    `;
  };
}
