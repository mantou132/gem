// https://spectrum.adobe.com/page/breadcrumbs/
import { adoptedStyle, customElement, property, boolattribute, part, aria, shadow } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';

import './use';
import './tooltip';
import './action-text';

const style = css`
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
`;

export type BreadcrumbsItem = {
  title?: string;
  icon?: string | Element | DocumentFragment;
  tooltip?: string;
  handle?: () => void;
};

@customElement('dy-breadcrumbs')
@adoptedStyle(style)
@aria({ ariaLabel: 'breadcrumbs' })
@shadow()
export class DuoyunBreadcrumbsElement extends GemElement {
  @part static item: string;

  @boolattribute compact: boolean;

  /**@deprecated */
  @property list?: BreadcrumbsItem[];
  @property items?: BreadcrumbsItem[];

  get #items() {
    return this.items || this.list;
  }

  render = () => {
    return html`
      ${this.#items?.map(
        ({ title, tooltip, handle, icon }, index, arr, isLast = arr.length - 1 === index) => html`
          <dy-tooltip .content=${tooltip}>
            <dy-use v-if=${!!icon} class="item-icon" .element=${icon}></dy-use>
            <dy-action-text
              v-else
              role="link"
              part=${DuoyunBreadcrumbsElement.item}
              @click=${handle}
              @keydown=${commonHandle}
              class=${classMap({ 'item-title': true, current: isLast })}
            >
              ${title}
            </dy-action-text>
          </dy-tooltip>
          <dy-use v-if=${!isLast} class="separator" role="separator" .element=${icons.right}></dy-use>
        `,
      )}
    `;
  };
}
