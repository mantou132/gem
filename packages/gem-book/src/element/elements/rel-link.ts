import { html, GemElement, customElement, connectStore, property } from '@mantou/gem';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize } from '../lib/utils';
import { bookStore } from '../store';

import '@mantou/gem/elements/link';

@customElement('gem-book-rel-link')
@connectStore(bookStore)
export class RelLink extends GemElement {
  @property links: NavItem[];

  render() {
    const { currentLinks, getCurrentLink } = bookStore;
    const currentLink = getCurrentLink?.();
    if (!currentLinks || !currentLink) return;
    const index = currentLinks.findIndex((item) => currentLink.originLink === item.originLink);
    const prev = currentLinks[index - 1];
    const next = currentLinks[index + 1];
    return html`
      <style>
        :host {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          padding: 2rem 0;
          line-height: 1.5;
          border-top: 1px solid ${theme.borderColor};
        }
        gem-link {
          border-bottom: 1px solid rgba(${theme.textColorRGB}, 0.3);
          color: inherit;
          text-decoration: none;
        }
        gem-link:hover {
          border-bottom: 1px solid;
        }
      </style>
      ${prev ? html`<gem-link path=${prev.link}>← ${capitalize(prev.title)}</gem-link>` : null}
      <div></div>
      ${next ? html`<gem-link path=${next.link}>${capitalize(next.title)} →</gem-link>` : null}
    `;
  }
}
