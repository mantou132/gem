import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import {
  adoptedStyle,
  aria,
  attribute,
  customElement,
  effect,
  shadow,
  slot,
  template,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { getSemanticColor, theme } from '../lib/theme';

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
  :host(:where(:not([hidden]))) {
    align-self: stretch;
    display: flex;
    align-items: center;
    gap: 1em;
    --size: 1px;
  }
  :host([orientation='vertical']) {
    writing-mode: sideways-rl;
  }
  :host([size='medium']) {
    font-weight: 500;
    --size: 2px;
  }
  :host([size='large']) {
    font-weight: 700;
    --size: 4px;
  }
  :host([position='start']) .start,
  :host([position='end']) .end {
    display: none;
  }
  slot {
    color: ${theme.textColor};
    display: inline;
  }
  :host(:not([position='start'], [position='end'])) slot {
    margin-inline: -4px;
  }
  slot::slotted(*) {
    margin-inline: -1em;
  }
  .collapse {
    margin-inline: -1em;
  }
  .line,
  .collapse {
    border-radius: 10px;
    flex-grow: 1;
    background: ${elementTheme.color};
    block-size: var(--size);
  }
`;

@customElement('dy-divider')
@adoptedStyle(style)
@aria({ role: 'separator' })
@shadow()
export class DuoyunDividerElement extends GemElement {
  @slot static unnamed: string;

  @attribute size: 'small' | 'medium' | 'large';
  @attribute color: string;
  @attribute orientation: 'horizontal' | 'vertical';
  @attribute position: 'start' | 'center' | 'end';

  get #orientation() {
    return this.orientation || 'horizontal';
  }

  get #color() {
    if (this.color) return getSemanticColor(this.color) || this.color;
    switch (this.size) {
      case 'large':
        return theme.textColor;
      default:
        return theme.borderColor;
    }
  }

  @effect()
  #updateAria = () => {
    this.internals.ariaOrientation = this.#orientation;
  };

  @elementTheme()
  #theme = () => ({ color: this.#color });

  @template()
  #content = () => {
    return html`
      <span class="line start"></span>
      <slot>
        <div class="collapse"></div>
      </slot>
      <span class="line end"></span>
    `;
  };
}
