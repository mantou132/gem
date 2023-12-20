// https://spectrum.adobe.com/page/breadcrumbs/
import { adoptedStyle, customElement, property, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';

import './use';
import './tooltip';
import './action-text';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    gap: 0.3em;
    color: ${theme.describeColor};
  }
  :host([compact]) {
    font-size: 0.875em;
  }
  .item-title {
    text-transform: capitalize;
  }
  .item-icon {
    width: 1.5em;
  }
  .item-title,
  .item-icon,
  .separator {
    flex-shrink: 0;
  }
  .separator {
    width: 1em;
    margin-bottom: -0.2em;
  }
  .item-icon:hover,
  .current {
    color: ${theme.primaryColor};
    font-weight: bold;
  }
`);

export type BreadcrumbsItem = {
  title?: string;
  icon?: string | Element | DocumentFragment;
  tooltip?: string;
  handle?: () => void;
};

/**
 * @customElement dy-breadcrumbs
 */
@customElement('dy-breadcrumbs')
@adoptedStyle(style)
export class DuoyunBreadcrumbsElement extends GemElement {
  @boolattribute compact: boolean;

  /**@deprecated */
  @property list?: BreadcrumbsItem[];
  @property items?: BreadcrumbsItem[];

  get #items() {
    return this.items || this.list;
  }

  constructor() {
    super();
    this.internals.ariaLabel = 'breadcrumbs';
  }

  render = () => {
    return html`
      ${this.#items?.map(
        ({ title, tooltip, handle, icon }, index, arr, isLast = arr.length - 1 === index) => html`
          <dy-tooltip .content=${tooltip}>
            ${icon
              ? html`<dy-use class="item-icon" .element=${icon}></dy-use>`
              : html`
                  <dy-action-text
                    role="link"
                    @click=${handle}
                    @keydown=${commonHandle}
                    class=${classMap({ 'item-title': true, current: isLast })}
                  >
                    ${title}
                  </dy-action-text>
                `}
          </dy-tooltip>
          ${!isLast ? html`<dy-use class="separator" role="separator" .element=${icons.right}></dy-use>` : ''}
        `,
      )}
    `;
  };
}
