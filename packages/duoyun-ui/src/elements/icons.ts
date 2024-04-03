import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { locale } from '../lib/locale';

import { Toast } from './toast';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6em, 1fr));
    gap: ${theme.gridGutter};
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1em;
    border-radius: ${theme.normalRound};
    padding: 1em;
    cursor: default;
    background-color: ${theme.lightBackgroundColor};
  }
  .item:hover {
    background-color: ${theme.hoverBackgroundColor};
  }
  .icon {
    width: 2em;
  }
`);

/**
 * @customElement dy-icons
 */
@customElement('dy-icons')
@adoptedStyle(style)
export class DuoyunIconsElement extends GemElement {
  #onCopy = async (name: string) => {
    await navigator.clipboard.writeText(`<dy-use .element=\${icons.${name}}></dy-use>`);
    Toast.open('success', `${locale.copySuccess}: ${name}`);
  };

  render = () => {
    const entries = Object.entries(icons);
    return html`
      ${entries.map(([name, value]) => {
        return html`
          <div class="item" @click=${() => this.#onCopy(name)}>
            <dy-use class="icon" .element=${value}></dy-use>${name}
          </div>
        `;
      })}
    `;
  };
}
