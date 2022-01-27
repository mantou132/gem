// TODO: move to docs

import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { locale } from '../lib/locale';

import { Toast } from './toast';

import '@mantou/gem/elements/use';

const style = createCSSSheet(css`
  :host {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6em, 1fr));
    gap: ${theme.gridGutter};
  }
  div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1em;
    border-radius: ${theme.normalRound};
    padding: 1em;
    cursor: default;
    background-color: ${theme.lightBackgroundColor};
  }
  div:hover {
    background-color: ${theme.hoverBackgroundColor};
  }
  gem-use {
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
    await navigator.clipboard.writeText(`<gem-use .element=\${icons.${name}}></gem-use>`);
    Toast.open('success', locale.copySuccess, {
      duration: 1000,
    });
  };

  render = () => {
    const entries = Object.entries(icons);
    return html`
      ${entries.map(([name, value]) => {
        return html`<div @click=${() => this.#onCopy(name)}><gem-use .element=${value}></gem-use>${name}</div>`;
      })}
    `;
  };
}
