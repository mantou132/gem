import { adoptedStyle, customElement, shadow } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import { Toast } from './toast';

import './use';

const style = css`
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
`;

@customElement('dy-icons')
@adoptedStyle(style)
@shadow()
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
